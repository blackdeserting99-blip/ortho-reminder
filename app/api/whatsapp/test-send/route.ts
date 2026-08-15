import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  normalizePhone,
  type WhatsAppTemplateComponent,
  sendWhatsAppTemplate,
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

function formatTemplateDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const d = date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const t = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
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
  const templateName = (process.env.WHATSAPP_TEST_TEMPLATE_NAME || "hello_world").trim();
  const templateLanguageCode = (process.env.WHATSAPP_TEST_TEMPLATE_LANGUAGE || "en_US").trim();
  const useTemplateForTest =
    (process.env.WHATSAPP_TEST_SEND_MODE || "template").trim().toLowerCase() === "template";

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
    userId: user.id,
  });

  if (!credentials) {
    return NextResponse.json(
      { error: "Meta WhatsApp is not connected for this doctor account." },
      { status: 400 }
    );
  }

  let templateComponents: WhatsAppTemplateComponent[] | undefined;
  if (useTemplateForTest && templateName === "jaspers_market_order_confirmation_v1") {
    const patientRows = await sql`
      SELECT
        p.id,
        p.name,
        p.phone,
        (
          SELECT a.id
          FROM "Appointment" a
          WHERE a."patientId" = p.id
          ORDER BY a.id DESC
          LIMIT 1
        ) AS "latestAppointmentId",
        (
          SELECT a."scheduledAt"
          FROM "Appointment" a
          WHERE a."patientId" = p.id
          ORDER BY a.id DESC
          LIMIT 1
        ) AS "latestScheduledAt"
      FROM "Patient" p
      WHERE p."userId" = ${user.id}
      ORDER BY p.id DESC
      LIMIT 200
    `;

    const matchedPatient = (patientRows as Array<Record<string, unknown>>).find(
      (row) => normalizePhone(String(row.phone || "")).trim() === normalizedPhone
    );

    if (!matchedPatient) {
      return NextResponse.json(
        {
          error: "No patient with this phone exists for the logged-in doctor.",
          details:
            "Create/select a patient with this phone and at least one appointment, then retry template send.",
        },
        { status: 400 }
      );
    }

    const patientName = String(matchedPatient.name || "Patient").trim() || "Patient";
    const latestAppointmentId = String(matchedPatient.latestAppointmentId || "").trim();
    const latestScheduledAtText = formatTemplateDateTime(
      (matchedPatient.latestScheduledAt as string | Date | null | undefined) || null
    );

    if (!latestAppointmentId || !latestScheduledAtText) {
      return NextResponse.json(
        {
          error: "Template requires appointment data but no appointment was found.",
          details:
            "The selected template needs 3 parameters (name, appointment id, appointment datetime).",
        },
        { status: 400 }
      );
    }

    templateComponents = [
      {
        type: "body",
        parameters: [
          { type: "text", text: patientName },
          { type: "text", text: latestAppointmentId },
          { type: "text", text: latestScheduledAtText },
        ],
      },
    ];
  }

  const outboundPayload = useTemplateForTest
    ? {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguageCode },
          ...(templateComponents ? { components: templateComponents } : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      };

  console.info(
    "[META TEST SEND PAYLOAD]",
    JSON.stringify({
      doctorId: user.id,
      endpoint: `https://graph.facebook.com/${(process.env.META_GRAPH_API_VERSION || "v23.0").trim()}/${credentials.phoneNumberId}/messages`,
      payload: outboundPayload,
    })
  );

  const startedAt = Date.now();
  const result = useTemplateForTest
    ? await sendWhatsAppTemplate(
        credentials,
        normalizedPhone,
        templateName,
        templateLanguageCode,
        templateComponents
      )
    : await sendWhatsAppText(credentials, normalizedPhone, message);
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
      mode: useTemplateForTest ? "template" : "text",
      templateName: useTemplateForTest ? templateName : null,
      templateLanguageCode: useTemplateForTest ? templateLanguageCode : null,
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