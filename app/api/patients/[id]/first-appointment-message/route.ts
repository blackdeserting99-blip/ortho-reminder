import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  buildWhatsAppBotMessage,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  appointmentDate: z.string().min(1),
  appointmentTime: z.string().min(1),
});

type MetadataObject = Record<string, unknown>;

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(connectionString);
}

function toMetadataObject(value: unknown): MetadataObject {
  if (typeof value === "string") {
    try {
      return toMetadataObject(JSON.parse(value));
    } catch {
      return {};
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MetadataObject;
}

function readAlignerDaysPerTray(metadata: unknown): number {
  const obj = toMetadataObject(metadata);
  const value = Number(obj.alignerDaysPerTray || 14);
  if (!Number.isFinite(value) || value <= 0 || value > 30) {
    return 14;
  }

  return Math.floor(value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const patientId = Number(id);
    if (!Number.isFinite(patientId)) {
      return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "appointmentDate and appointmentTime are required" },
        { status: 400 }
      );
    }

    const sql = getSqlClient();
    const patientRows = await sql`
      SELECT
        p.id,
        p.name,
        p.phone,
        p."treatmentCategory",
        p."elasticEnabled",
        p."elasticType",
        p."tadsNote",
        p."myofunctionalType",
        p."myofunctionalProgram",
        p.metadata,
        p."clinicName",
        u.name AS "doctorName",
        u."whatsappAccessToken",
        u."whatsappPhoneNumberId"
      FROM "Patient" p
      LEFT JOIN "User" u ON u.id = p."userId"
      WHERE p.id = ${patientId} AND p."userId" = ${user.id}
      LIMIT 1
    `;

    const patient = patientRows?.[0] ?? null;

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const visitRows = await sql`
      SELECT elastics, tads
      FROM "Visit"
      WHERE "patientId" = ${patientId}
      ORDER BY id DESC
      LIMIT 5
    `;

    const phone = (patient.phone || "").trim();
    if (!phone) {
      return NextResponse.json({ error: "Patient phone is missing" }, { status: 400 });
    }

    const doctorCredentials = await buildDoctorWhatsAppCredentials({
      whatsappAccessToken: patient.whatsappAccessToken ?? null,
      whatsappPhoneNumberId: patient.whatsappPhoneNumberId ?? null,
    });

    const patientMessage = buildWhatsAppBotMessage(
      {
        name: patient.name || undefined,
        clinicName: patient.clinicName || undefined,
        doctorName: patient.doctorName || undefined,
        phone,
        appointmentDate: parsed.data.appointmentDate,
        appointmentTime: parsed.data.appointmentTime,
        treatmentCategory: patient.treatmentCategory || undefined,
        alignerDaysPerTray: readAlignerDaysPerTray(patient.metadata),
        firstAppointment: true,
        elasticEnabled: Boolean(patient.elasticEnabled),
        elasticType: patient.elasticType || undefined,
        tadsNote: patient.tadsNote || undefined,
        myofunctionalType: patient.myofunctionalType || undefined,
        myofunctionalProgram: patient.myofunctionalProgram || undefined,
        visits: (visitRows as Array<{ elastics?: string | null; tads?: string | null }>).map((visit) => ({
          elasticEnabled: Boolean(visit.elastics),
          elasticType: visit.elastics || undefined,
          tadsNote: visit.tads || undefined,
        })),
      },
      "general"
    );

    const sendResult = await sendWhatsAppText(doctorCredentials, phone, patientMessage);
    if (!sendResult.ok) {
      return NextResponse.json(
        {
          error: "Failed to send first appointment WhatsApp message",
          details: sendResult.error || "Unknown provider error",
          provider: sendResult.provider,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: sendResult.provider,
      messageId: sendResult.messageId || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send first appointment WhatsApp message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}