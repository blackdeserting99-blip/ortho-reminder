import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  buildElasticsStartedDoctorMessage,
  buildElasticsStartedPatientMessage,
  buildTadsStartedDoctorMessage,
  buildTadsStartedPatientMessage,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

const hasValue = (value: unknown) => String(value ?? "").trim().length > 0;

function getMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

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

  const previousHadElastics = hasValue(visit.elastics);
  const nextElastics = body.elastics ?? visit.elastics;
  const previousHadTads = hasValue(visit.tads);
  const nextTads = body.tads ?? visit.tads;

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

  const updatedMetadata = getMetadataObject(updated.metadata);
  const shouldNotifyFromThisVisit = !previousHadElastics && hasValue(nextElastics);

  if (shouldNotifyFromThisVisit && updatedMetadata.elasticsStartedNotified !== true) {
    const hadElasticsInOtherVisits = await prisma.visit.count({
      where: {
        patientId,
        id: { not: visitIdNumber },
        elastics: { not: null },
      },
    });

    if (hadElasticsInOtherVisits === 0) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, userId: user.id },
      });

      if (patient?.phone?.trim()) {
        const doctorName = process.env.DOCTOR_DISPLAY_NAME || "Doctor";
        const patientMessage = buildElasticsStartedPatientMessage({
          patientName: patient.name,
          elasticType: String(nextElastics),
          doctorName,
        });
        await sendWhatsAppText(patient.phone, patientMessage);

        const doctorPhone = process.env.DOCTOR_WHATSAPP_PHONE || "";
        if (doctorPhone) {
          const doctorMessage = buildElasticsStartedDoctorMessage({
            patientName: patient.name,
            patientPhone: patient.phone,
            elasticType: String(nextElastics),
          });
          await sendWhatsAppText(doctorPhone, doctorMessage);
        }

        await prisma.visit.update({
          where: { id: visitIdNumber },
          data: {
            metadata: {
              ...updatedMetadata,
              elasticsStartedNotified: true,
            },
          },
        });
      }
    }
  }

  const shouldNotifyTadsFromThisVisit = !previousHadTads && hasValue(nextTads);

  if (shouldNotifyTadsFromThisVisit && updatedMetadata.tadsStartedNotified !== true) {
    const hadTadsInOtherVisits = await prisma.visit.count({
      where: {
        patientId,
        id: { not: visitIdNumber },
        tads: { not: null },
      },
    });

    if (hadTadsInOtherVisits === 0) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, userId: user.id },
      });

      if (patient?.phone?.trim()) {
        const doctorName = process.env.DOCTOR_DISPLAY_NAME || "Doctor";
        const patientMessage = buildTadsStartedPatientMessage({
          patientName: patient.name,
          tadsNote: String(nextTads),
          doctorName,
        });
        await sendWhatsAppText(patient.phone, patientMessage);

        const doctorPhone = process.env.DOCTOR_WHATSAPP_PHONE || "";
        if (doctorPhone) {
          const doctorMessage = buildTadsStartedDoctorMessage({
            patientName: patient.name,
            patientPhone: patient.phone,
            tadsNote: String(nextTads),
          });
          await sendWhatsAppText(doctorPhone, doctorMessage);
        }

        await prisma.visit.update({
          where: { id: visitIdNumber },
          data: {
            metadata: {
              ...updatedMetadata,
              tadsStartedNotified: true,
            },
          },
        });
      }
    }
  }

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
