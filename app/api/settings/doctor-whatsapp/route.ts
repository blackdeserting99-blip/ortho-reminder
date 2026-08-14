import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import {
  buildDoctorWhatsAppCredentials,
  encryptWhatsAppProviderToken,
  normalizePhone,
} from "@/app/lib/whatsapp";
import { neon } from "@neondatabase/serverless";

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

function maskValue(value: string | null | undefined, visible = 4) {
  const raw = (value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.length <= visible) {
    return "*".repeat(raw.length);
  }

  return `${"*".repeat(Math.max(raw.length - visible, 0))}${raw.slice(-visible)}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let freshUser:
    | {
        whatsappPhone: string | null;
        whatsappBusinessAccountId: string | null;
        whatsappPhoneNumberId: string | null;
        whatsappAccessToken: string | null;
        whatsappConnectedAt: Date | null;
      }
    | null = null;

  try {
    const { prisma } = await import("@/app/lib/prisma");
    freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        whatsappPhone: true,
        whatsappBusinessAccountId: true,
        whatsappPhoneNumberId: true,
        whatsappAccessToken: true,
        whatsappConnectedAt: true,
      },
    });
  } catch {
    const sql = getSqlClient();
    const rows = await sql`
      SELECT
        "whatsappPhone",
        "whatsappBusinessAccountId",
        "whatsappPhoneNumberId",
        "whatsappAccessToken",
        "whatsappConnectedAt"
      FROM "User"
      WHERE id = ${user.id}
      LIMIT 1
    `;

    const row = rows?.[0];
    freshUser = row
      ? {
          whatsappPhone: row.whatsappPhone ? String(row.whatsappPhone) : null,
          whatsappBusinessAccountId: row.whatsappBusinessAccountId
            ? String(row.whatsappBusinessAccountId)
            : null,
          whatsappPhoneNumberId: row.whatsappPhoneNumberId
            ? String(row.whatsappPhoneNumberId)
            : null,
          whatsappAccessToken: row.whatsappAccessToken
            ? String(row.whatsappAccessToken)
            : null,
          whatsappConnectedAt: row.whatsappConnectedAt
            ? new Date(String(row.whatsappConnectedAt))
            : null,
        }
      : null;
  }

  const credentials = await buildDoctorWhatsAppCredentials({
    whatsappAccessToken: freshUser?.whatsappAccessToken,
    whatsappPhoneNumberId: freshUser?.whatsappPhoneNumberId,
    whatsappBusinessAccountId: freshUser?.whatsappBusinessAccountId,
  });
  const connected = Boolean(credentials);

  return NextResponse.json({
    phone: freshUser?.whatsappPhone || "",
    connected,
    whatsapp: {
      connected,
      connectedAt: freshUser?.whatsappConnectedAt || null,
      businessAccountIdMasked: maskValue(
        freshUser?.whatsappBusinessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
      ),
      phoneNumberIdMasked: maskValue(
        freshUser?.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle Cloudflare Workers JSON quote-stripping
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    try {
      body = JSON.parse(text);
    } catch {
      const fixed = text
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (m, v, e) =>
          v === 'true' || v === 'false' || v === 'null' || !isNaN(v) ? `:${v}${e}` : `:"${v}"${e}`
        );
      body = JSON.parse(fixed);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const whatsappBusinessAccountId =
    typeof body.whatsappBusinessAccountId === "string"
      ? body.whatsappBusinessAccountId.trim()
      : "";
  const whatsappPhoneNumberId =
    typeof body.whatsappPhoneNumberId === "string"
      ? body.whatsappPhoneNumberId.trim()
      : "";
  const whatsappAccessToken =
    typeof body.whatsappAccessToken === "string"
      ? body.whatsappAccessToken.trim()
      : "";

  if (!phone && !whatsappBusinessAccountId && !whatsappPhoneNumberId && !whatsappAccessToken) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const hasAnyMetaField =
    Boolean(whatsappBusinessAccountId) ||
    Boolean(whatsappPhoneNumberId) ||
    Boolean(whatsappAccessToken);

  const hasAllMetaFields =
    Boolean(whatsappBusinessAccountId) &&
    Boolean(whatsappPhoneNumberId) &&
    Boolean(whatsappAccessToken);

  if (hasAnyMetaField && !hasAllMetaFields) {
    return NextResponse.json(
      {
        error:
          "Meta WhatsApp Business Account ID, Phone Number ID, and Access Token must be provided together",
      },
      { status: 400 }
    );
  }

  const normalized = phone ? normalizePhone(phone) : "";
  const encryptedApiToken = whatsappAccessToken
    ? await encryptWhatsAppProviderToken(whatsappAccessToken)
    : null;

  try {
    const { prisma } = await import("@/app/lib/prisma");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(phone ? { whatsappPhone: normalized } : {}),
        ...(hasAllMetaFields
          ? {
              whatsappBusinessAccountId,
              whatsappPhoneNumberId,
              whatsappAccessToken: encryptedApiToken,
              whatsappConnectedAt: new Date(),
            }
          : {}),
      },
    });
  } catch {
    const sql = getSqlClient();
    if (hasAllMetaFields) {
      await sql`
        UPDATE "User"
        SET "whatsappPhone" = ${phone ? normalized : null},
            "whatsappBusinessAccountId" = ${whatsappBusinessAccountId},
            "whatsappPhoneNumberId" = ${whatsappPhoneNumberId},
            "whatsappAccessToken" = ${encryptedApiToken},
            "whatsappConnectedAt" = ${new Date()},
            "updatedAt" = ${new Date()}
        WHERE id = ${user.id}
      `;
    } else {
      await sql`
        UPDATE "User"
        SET "whatsappPhone" = ${normalized},
            "updatedAt" = ${new Date()}
        WHERE id = ${user.id}
      `;
    }
  }

  const response = NextResponse.json({
    ok: true,
    phone: phone ? normalized : undefined,
    connected: hasAllMetaFields,
  });

  if (hasAllMetaFields) {
    response.cookies.set("whatsapp_configured", "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  return response;
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/app/lib/prisma");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        whatsappBusinessAccountId: null,
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
        whatsappConnectedAt: null,
      },
    });
  } catch {
    const sql = getSqlClient();
    await sql`
      UPDATE "User"
      SET "whatsappBusinessAccountId" = NULL,
          "whatsappPhoneNumberId" = NULL,
          "whatsappAccessToken" = NULL,
          "whatsappConnectedAt" = NULL,
          "updatedAt" = ${new Date()}
      WHERE id = ${user.id}
    `;
  }

  const response = NextResponse.json({ ok: true, connected: false });
  response.cookies.set("whatsapp_configured", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
