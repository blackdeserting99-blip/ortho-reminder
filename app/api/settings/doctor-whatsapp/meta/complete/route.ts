import { NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/app/lib/auth";
import {
  buildDoctorWhatsAppCredentials,
  encryptWhatsAppProviderToken,
  normalizePhone,
  testWhatsAppConnection,
} from "@/app/lib/whatsapp";

const bodySchema = z.object({
  code: z.string().min(1),
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().min(1),
  phone: z.string().optional(),
});

function getDatabaseUrl() {
  const primary = process.env.DATABASE_URL;
  if (primary && primary !== "undefined" && primary.trim().length > 0) {
    return primary;
  }

  const fallback = process.env.NEON_DATABASE_URL;
  if (fallback && fallback !== "undefined" && fallback.trim().length > 0) {
    return fallback;
  }

  return null;
}

function getSqlClient() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

function getMetaGraphApiVersion() {
  return (process.env.META_GRAPH_API_VERSION || "v23.0").trim();
}

async function exchangeCodeForToken(code: string) {
  const appId = (process.env.META_APP_ID || "").trim();
  const appSecret = (process.env.META_APP_SECRET || "").trim();
  const redirectUri = (process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI || "").trim();

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required");
  }

  const url = new URL(`https://graph.facebook.com/${getMetaGraphApiVersion()}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  if (redirectUri) {
    url.searchParams.set("redirect_uri", redirectUri);
  }

  const response = await fetch(url.toString(), { method: "GET" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Failed to exchange Meta code (HTTP ${response.status})`;
    throw new Error(message);
  }

  const accessToken = String(payload?.access_token || "").trim();
  if (!accessToken) {
    throw new Error("Meta token exchange succeeded but no access_token was returned");
  }

  return accessToken;
}

async function validateAndSubscribeAssets(input: {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId: string;
}) {
  const baseUrl = `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
  const headers = { Authorization: `Bearer ${input.accessToken}` };
  const phoneNumbersUrl = new URL(`${baseUrl}/${input.businessAccountId}/phone_numbers`);
  phoneNumbersUrl.searchParams.set("fields", "id");

  const phoneNumbersResponse = await fetch(phoneNumbersUrl, { headers });
  const phoneNumbersPayload = await phoneNumbersResponse.json().catch(() => null);
  if (!phoneNumbersResponse.ok) {
    throw new Error(phoneNumbersPayload?.error?.message || "Meta could not verify the WhatsApp Business account");
  }

  const ownsPhoneNumber = Array.isArray(phoneNumbersPayload?.data) && phoneNumbersPayload.data.some(
    (phoneNumber: { id?: unknown }) => String(phoneNumber.id || "") === input.phoneNumberId
  );
  if (!ownsPhoneNumber) {
    throw new Error("The selected WhatsApp phone number is not authorized for this business account");
  }

  const subscribeResponse = await fetch(`${baseUrl}/${input.businessAccountId}/subscribed_apps`, {
    method: "POST",
    headers,
  });
  const subscribePayload = await subscribeResponse.json().catch(() => null);
  if (!subscribeResponse.ok) {
    throw new Error(
      subscribePayload?.error?.message ||
        "Meta could not subscribe this WhatsApp Business account to webhooks. Advanced Access may still be required."
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    if (!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY?.trim()) {
      throw new Error("WHATSAPP_TOKEN_ENCRYPTION_KEY must be configured before connecting a doctor account");
    }

    const accessToken = await exchangeCodeForToken(parsed.data.code.trim());
    const businessAccountId = parsed.data.businessAccountId.trim();
    const phoneNumberId = parsed.data.phoneNumberId.trim();
    await validateAndSubscribeAssets({ accessToken, businessAccountId, phoneNumberId });

    const credentials = await buildDoctorWhatsAppCredentials({
      whatsappAccessToken: accessToken,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: businessAccountId,
    });

    const tested = await testWhatsAppConnection(credentials);
    if (!tested.ok) {
      return NextResponse.json(
        {
          error: "Meta WhatsApp account verification failed",
          details: tested.error || "Unable to verify phone number access",
        },
        { status: 502 }
      );
    }

    const encryptedToken = await encryptWhatsAppProviderToken(accessToken);
    const normalizedPhone = normalizePhone((parsed.data.phone || "").trim());

    try {
      const { prisma } = await import("@/app/lib/prisma");
      const assignedElsewhere = await prisma.user.findFirst({
        where: {
          id: { not: user.id },
          OR: [
            { whatsappBusinessAccountId: businessAccountId },
            { whatsappPhoneNumberId: phoneNumberId },
          ],
        },
        select: { id: true },
      });
      if (assignedElsewhere) {
        throw new Error("This WhatsApp Business account or phone number is already connected to another doctor");
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(normalizedPhone ? { whatsappPhone: normalizedPhone } : {}),
          whatsappBusinessAccountId: businessAccountId,
          whatsappPhoneNumberId: phoneNumberId,
          whatsappAccessToken: encryptedToken,
          whatsappConnectedAt: new Date(),
        },
      });
    } catch {
      const sql = getSqlClient();
      const assignedElsewhere = await sql`
        SELECT id
        FROM "User"
        WHERE id <> ${user.id}
          AND (
            "whatsappBusinessAccountId" = ${businessAccountId}
            OR "whatsappPhoneNumberId" = ${phoneNumberId}
          )
        LIMIT 1
      `;
      if (assignedElsewhere?.[0]) {
        throw new Error("This WhatsApp Business account or phone number is already connected to another doctor");
      }
      await sql`
        UPDATE "User"
        SET "whatsappPhone" = ${normalizedPhone || null},
            "whatsappBusinessAccountId" = ${businessAccountId},
            "whatsappPhoneNumberId" = ${phoneNumberId},
            "whatsappAccessToken" = ${encryptedToken},
            "whatsappConnectedAt" = ${new Date()},
            "updatedAt" = ${new Date()}
        WHERE id = ${user.id}
      `;
    }

    const response = NextResponse.json({ ok: true, provider: "meta" });
    response.cookies.set("whatsapp_configured", "1", {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to complete Meta Embedded Signup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
