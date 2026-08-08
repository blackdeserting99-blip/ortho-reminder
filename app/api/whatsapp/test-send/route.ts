import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  normalizePhone,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

const requestSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1).max(2000).optional(),
});

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phone is required for test message", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const phone = parsed.data.phone.trim();
  const normalizedPhone = normalizePhone(phone);
  const message =
    parsed.data.message?.trim() ||
    `Meta WhatsApp test from OrthoPrime OA at ${new Date().toISOString()}`;

  const sql = getSqlClient();
  const rows = await sql`
    SELECT "whatsappAccessToken", "whatsappPhoneNumberId", "whatsappBusinessAccountId"
    FROM "User"
    WHERE id = ${user.id}
    LIMIT 1
  `;
  const doctor = rows?.[0] ?? null;

  const credentials = await buildDoctorWhatsAppCredentials({
    whatsappAccessToken: doctor?.whatsappAccessToken ?? null,
    whatsappPhoneNumberId: doctor?.whatsappPhoneNumberId ?? null,
    whatsappBusinessAccountId: doctor?.whatsappBusinessAccountId ?? null,
  });

  if (!credentials) {
    return NextResponse.json(
      { error: "Meta WhatsApp is not connected for this doctor account." },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  const result = await sendWhatsAppText(credentials, normalizedPhone, message);
  const debug = {
    at: new Date().toISOString(),
    doctorId: user.id,
    provider: "meta",
    request: {
      phoneNumberId: credentials.phoneNumberId,
      businessAccountId: credentials.businessAccountId,
      phoneInput: phone,
      phoneNormalized: normalizedPhone,
      messageLength: message.length,
      tokenPreview: `${credentials.accessToken.slice(0, 3)}***${credentials.accessToken.slice(-2)}`,
    },
    response: {
      ok: result.ok,
      provider: result.provider,
      messageId: result.messageId || null,
      error: result.error || null,
      api: result.debug || null,
    },
    durationMs: Date.now() - startedAt,
  };

  console.info("[META TEST SEND DEBUG]", JSON.stringify(debug));

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Failed to send test WhatsApp message",
        details: result.error || "Unknown Meta error",
        debug,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Test WhatsApp sent successfully.",
    provider: result.provider,
    messageId: result.messageId || null,
    debug,
  });
}