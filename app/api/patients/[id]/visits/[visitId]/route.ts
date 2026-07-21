import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, visitId } = await params;
  const patientId = Number(id);
  const visitIdNumber = Number(visitId);

  if (!Number.isFinite(patientId) || !Number.isFinite(visitIdNumber)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitIdNumber, patient: { id: patientId, userId: user.id } },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const toDateOrNull = (value: unknown): Date | null => {
    if (!value) {
      return null;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const nextVisitDate = toDateOrNull(body.visitDate ?? body.date);
  const nextAppointmentDate = toDateOrNull(body.nextAppointment);

  const updated = await prisma.visit.update({
    where: { id: visitIdNumber },
    data: {
      visitDate: nextVisitDate ?? visit.visitDate,
      wireType: body.wireType ?? body.wireUsed ?? visit.wireType,
      upperArch: body.upperArch ?? visit.upperArch,
      lowerArch: body.lowerArch ?? visit.lowerArch,
      elastics: body.elastics ?? visit.elastics,
      tads: body.tads ?? visit.tads,
      plannedUpperArch: body.plannedUpperArch ?? visit.plannedUpperArch,
      plannedLowerArch: body.plannedLowerArch ?? visit.plannedLowerArch,
      plannedElasticType: body.plannedElasticType ?? visit.plannedElasticType,
      plannedTadsNote: body.plannedTadsNote ?? visit.plannedTadsNote,
      treatmentNotes: body.treatmentNotes ?? visit.treatmentNotes,
      nextAppointment: nextAppointmentDate ?? visit.nextAppointment,
      paymentCollected: body.paymentCollected ?? visit.paymentCollected,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; visitId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, visitId } = await params;
  const patientId = Number(id);
  const visitIdNumber = Number(visitId);

  if (!Number.isFinite(patientId) || !Number.isFinite(visitIdNumber)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const visit = await prisma.visit.findFirst({
    where: { id: visitIdNumber, patient: { id: patientId, userId: user.id } },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  await prisma.visit.delete({ where: { id: visitIdNumber } });

  return NextResponse.json({ success: true });
}
