import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

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
    include: {
      visits: {
        include: {
          visitMedia: true,
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient.visits);
}

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
  if (!body || !body.date) {
    return NextResponse.json({ error: "Visit date is required" }, { status: 400 });
  }

  const visit = await prisma.visit.create({
    data: {
      patientId,
      date: body.date,
      time: body.time ?? null,
      wireUsed: body.wireUsed ?? null,
      upperArch: body.upperArch ?? null,
      lowerArch: body.lowerArch ?? null,
      elastics: body.elastics ?? null,
      tads: body.tads ?? null,
      treatmentNotes: body.treatmentNotes ?? null,
      paymentCollected: body.paymentCollected ?? null,
      doctorNotes: body.doctorNotes ?? null,
    },
  });

  return NextResponse.json(visit, { status: 201 });
}

