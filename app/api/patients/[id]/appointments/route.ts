import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appointmentSchema = z.object({
  scheduledAt: z.string().datetime(),
  status: z
    .enum([
      "SCHEDULED",
      "CONFIRMED",
      "RESCHEDULED",
      "COMPLETED",
      "CANCELED",
      "NO_SHOW",
    ])
    .default("SCHEDULED"),
  type: z.string().optional(),
  notes: z.string().optional(),
});

function getSqlClient() {
  const connectionString =
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json(
      { error: "Invalid patient id" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const sql = getSqlClient();

    const patientRows = await sql`
      SELECT id
      FROM "Patient"
      WHERE id = ${patientId} AND "userId" = ${user.id}
      LIMIT 1
    `;

    if (!patientRows?.[0]) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const inserted = await sql`
      INSERT INTO "Appointment" (
        "patientId",
        "scheduledAt",
        status,
        type,
        notes,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${patientId},
        ${new Date(parsed.data.scheduledAt)},
        ${parsed.data.status},
        ${parsed.data.type ?? null},
        ${parsed.data.notes ?? null},
        ${new Date()},
        ${new Date()}
      )
      RETURNING *
    `;

    return NextResponse.json(inserted?.[0] ?? null, { status: 201 });
  } catch (error) {
    console.error("[CREATE APPOINTMENT ERROR]", error);

    return NextResponse.json(
      {
        error: "Failed to create appointment",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json(
      { error: "Invalid patient id" },
      { status: 400 }
    );
  }

  try {
    const sql = getSqlClient();

    const patientRows = await sql`
      SELECT id
      FROM "Patient"
      WHERE id = ${patientId} AND "userId" = ${user.id}
      LIMIT 1
    `;

    if (!patientRows?.[0]) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const appointments = await sql`
      SELECT *
      FROM "Appointment"
      WHERE "patientId" = ${patientId}
      ORDER BY "scheduledAt" DESC
    `;

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[GET APPOINTMENTS ERROR]", error);

    return NextResponse.json(
      {
        error: "Failed to fetch appointments",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}