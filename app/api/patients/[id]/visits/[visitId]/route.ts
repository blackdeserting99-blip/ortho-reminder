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

  const updated = await prisma.visit.update({
    where: { id: visitIdNumber },
    data: {
      date: body.date ?? visit.date,
      time: body.time ?? visit.time,
      wireUsed: body.wireUsed ?? visit.wireUsed,
      upperArch: body.upperArch ?? visit.upperArch,
      lowerArch: body.lowerArch ?? visit.lowerArch,
      elastics: body.elastics ?? visit.elastics,
      tads: body.tads ?? visit.tads,
      treatmentNotes: body.treatmentNotes ?? visit.treatmentNotes,
      doctorNotes: body.doctorNotes ?? visit.doctorNotes,
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
