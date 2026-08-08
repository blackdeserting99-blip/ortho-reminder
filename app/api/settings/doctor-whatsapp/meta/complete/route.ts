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
    const accessToken = await exchangeCodeForToken(parsed.data.code.trim());

    const credentials = await buildDoctorWhatsAppCredentials({
      whatsappAccessToken: accessToken,
      whatsappPhoneNumberId: parsed.data.phoneNumberId.trim(),
      whatsappBusinessAccountId: parsed.data.businessAccountId.trim(),
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
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(normalizedPhone ? { whatsappPhone: normalizedPhone } : {}),
          whatsappBusinessAccountId: parsed.data.businessAccountId.trim(),
          whatsappPhoneNumberId: parsed.data.phoneNumberId.trim(),
          whatsappAccessToken: encryptedToken,
          whatsappConnectedAt: new Date(),
        },
      });
    } catch {
      const sql = getSqlClient();
      await sql`
        UPDATE "User"
        SET "whatsappPhone" = ${normalizedPhone || null},
            "whatsappBusinessAccountId" = ${parsed.data.businessAccountId.trim()},
            "whatsappPhoneNumberId" = ${parsed.data.phoneNumberId.trim()},
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
