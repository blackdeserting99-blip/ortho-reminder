import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const { phone, message, reminderType } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "phone and message are required" },
        { status: 400 }
      );
    }

    const sql = getSqlClient();
    const doctorRows = await sql`
      SELECT
        "whatsappAccessToken",
        "whatsappPhoneNumberId"
      FROM "User"
      WHERE id = ${user.id}
      LIMIT 1
    `;
    const doctor = doctorRows?.[0] ?? null;

    const doctorCredentials = await buildDoctorWhatsAppCredentials({
      whatsappAccessToken: doctor?.whatsappAccessToken ?? null,
      whatsappPhoneNumberId: doctor?.whatsappPhoneNumberId ?? null,
      userId: user.id,
    });

    const result = await sendWhatsAppText(doctorCredentials, phone, message);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Failed to send WhatsApp message",
          details: result.error || "Unknown provider error",
          provider: result.provider,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "ok",
      phone,
      reminderType,
      provider: result.provider,
      messageId: result.messageId || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send WhatsApp message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
