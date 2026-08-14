import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  normalizePhone,
  sendWhatsAppTemplate,
} from "@/app/lib/whatsapp";

const requestSchema = z.object({
  phone: z.string().min(1),
});

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

function getMetaGraphApiVersion() {
  return (process.env.META_GRAPH_API_VERSION || "v23.0").trim();
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
  const templateName = (
    process.env.WHATSAPP_APPOINTMENT_TEMPLATE_NAME || "appointment_reminder"
  ).trim();
  const templateLanguageCode = (
    process.env.WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE_CODE || ""
  ).trim();

  if (!templateLanguageCode) {
    return NextResponse.json(
      {
        error: "Template language is not configured.",
        details:
          "Set WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE_CODE in .env.local to the exact Meta template language code (for example: ar, ar_AR).",
      },
      { status: 500 }
    );
  }

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

  const outboundPayload = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLanguageCode },
    },
  };

  console.info(
    "[WHATSAPP TEST TEMPLATE PAYLOAD]",
    JSON.stringify({
      doctorId: user.id,
      endpoint: `https://graph.facebook.com/${getMetaGraphApiVersion()}/${credentials.phoneNumberId}/messages`,
      payload: outboundPayload,
    })
  );

  const startedAt = Date.now();
  const result = await sendWhatsAppTemplate(
    credentials,
    normalizedPhone,
    templateName,
    templateLanguageCode
  );
  const debug = {
    at: new Date().toISOString(),
    doctorId: user.id,
    provider: "meta",
    request: {
      graphApiVersion: getMetaGraphApiVersion(),
      phoneNumberId: credentials.phoneNumberId,
      businessAccountId: credentials.businessAccountId,
      phoneInput: phone,
      phoneNormalized: normalizedPhone,
      mode: "template",
      templateName,
      templateLanguageCode,
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
        error: "Failed to send appointment reminder template",
        details: result.error || "Unknown Meta error",
        debug,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "appointment_reminder template sent successfully.",
    provider: result.provider,
    messageId: result.messageId || null,
    debug,
  });
}