import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const appointmentSchema = z.object({
  scheduledAt: z.string().datetime(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"]).default("SCHEDULED"),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parseResult = appointmentSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parseResult.error.format() },
      { status: 400 }
    );
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        scheduledAt: new Date(parseResult.data.scheduledAt),
        status: parseResult.data.status,
        type: parseResult.data.type || null,
        notes: parseResult.data.notes || null,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("[APPOINTMENT API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create appointment", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[GET APPOINTMENTS ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
