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

async function sendElasticsStartedNotification(input: {
  patient: { id: number; name: string; phone: string | null };
  elasticType?: string | null;
  visitId: number;
}) {
  const patientPhone = (input.patient.phone || "").trim();
  if (!patientPhone) {
    return;
  }

  const visit = await prisma.visit.findUnique({ where: { id: input.visitId } });
  if (!visit) {
    return;
  }

  const metadata = getMetadataObject(visit.metadata);
  if (metadata.elasticsStartedNotified === true) {
    return;
  }

  const doctorName = process.env.DOCTOR_DISPLAY_NAME || "Doctor";
  const patientMessage = buildElasticsStartedPatientMessage({
    patientName: input.patient.name,
    elasticType: input.elasticType,
    doctorName,
  });
  await sendWhatsAppText(patientPhone, patientMessage);

  const doctorPhone = process.env.DOCTOR_WHATSAPP_PHONE || "";
  if (doctorPhone) {
    const doctorMessage = buildElasticsStartedDoctorMessage({
      patientName: input.patient.name,
      patientPhone: input.patient.phone || "-",
      elasticType: input.elasticType,
    });
    await sendWhatsAppText(doctorPhone, doctorMessage);
  }

  await prisma.visit.update({
    where: { id: input.visitId },
    data: {
      metadata: {
        ...metadata,
        elasticsStartedNotified: true,
      },
    },
  });
}

async function sendTadsStartedNotification(input: {
  patient: { id: number; name: string; phone: string | null };
  tadsNote?: string | null;
  visitId: number;
}) {
  const patientPhone = (input.patient.phone || "").trim();
  if (!patientPhone) {
    return;
  }

  const visit = await prisma.visit.findUnique({ where: { id: input.visitId } });
  if (!visit) {
    return;
  }

  const metadata = getMetadataObject(visit.metadata);
  if (metadata.tadsStartedNotified === true) {
    return;
  }

  const doctorName = process.env.DOCTOR_DISPLAY_NAME || "Doctor";
  const patientMessage = buildTadsStartedPatientMessage({
    patientName: input.patient.name,
    tadsNote: input.tadsNote,
    doctorName,
  });
  await sendWhatsAppText(patientPhone, patientMessage);

  const doctorPhone = process.env.DOCTOR_WHATSAPP_PHONE || "";
  if (doctorPhone) {
    const doctorMessage = buildTadsStartedDoctorMessage({
      patientName: input.patient.name,
      patientPhone: input.patient.phone || "-",
      tadsNote: input.tadsNote,
    });
    await sendWhatsAppText(doctorPhone, doctorMessage);
  }

  await prisma.visit.update({
    where: { id: input.visitId },
    data: {
      metadata: {
        ...metadata,
        tadsStartedNotified: true,
      },
    },
  });
}

const isUnknownPlannedFieldError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Unknown argument `plannedUpperArch`") ||
    error.message.includes("Unknown argument `plannedLowerArch`") ||
    error.message.includes("Unknown argument `plannedElasticType`") ||
    error.message.includes("Unknown argument `plannedTadsNote`")
  );
};

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
          medias: true,
        },
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(
    patient.visits.map((visit) => ({
      ...visit,
      visitMedia: visit.medias,
    }))
  );
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
  if (!body || !body.visitDate) {
    return NextResponse.json({ error: "Visit date is required" }, { status: 400 });
  }

  const hadElasticsBefore = await prisma.visit.count({
    where: {
      patientId,
      elastics: {
        not: null,
      },
    },
  });

  const hadTadsBefore = await prisma.visit.count({
    where: {
      patientId,
      tads: {
        not: null,
      },
    },
  });

  const buildCreateData = (includePlannedFields: boolean) => ({
    patientId,
    visitDate: new Date(body.visitDate),
    visitType: body.visitType ?? null,
    diagnosis: body.diagnosis ?? null,
    treatmentNotes: body.treatmentNotes ?? null,
    upperArch: body.upperArch ?? null,
    lowerArch: body.lowerArch ?? null,
    wireType: body.wireType ?? null,
    elastics: body.elastics ?? null,
    tads: body.tads ?? null,
    ...(includePlannedFields
      ? {
          plannedUpperArch: body.plannedUpperArch ?? null,
          plannedLowerArch: body.plannedLowerArch ?? null,
          plannedElasticType: body.plannedElasticType ?? null,
          plannedTadsNote: body.plannedTadsNote ?? null,
        }
      : {}),
    plannedTreatment: body.plannedTreatment ?? null,
    paymentCollected: body.paymentCollected ?? null,
    nextAppointment: body.nextAppointment ? new Date(body.nextAppointment) : null,
    chairTime: body.chairTime ?? null,
  });

  try {
    let visit;

    try {
      visit = await prisma.visit.create({
        data: buildCreateData(true),
      });
    } catch (error) {
      if (!isUnknownPlannedFieldError(error)) {
        throw error;
      }

      visit = await prisma.visit.create({
        data: buildCreateData(false),
      });
    }

    if (visit && hasValue(visit.elastics) && hadElasticsBefore === 0) {
      await sendElasticsStartedNotification({
        patient,
        elasticType: visit.elastics,
        visitId: visit.id,
      });
    }

    if (visit && hasValue(visit.tads) && hadTadsBefore === 0) {
      await sendTadsStartedNotification({
        patient,
        tadsNote: visit.tads,
        visitId: visit.id,
      });
    }

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    console.error('[POST /api/patients/[id]/visits ERROR]', error);
    return NextResponse.json(
      { error: "Failed to create visit", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  if (!body || !Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an array of visits" }, { status: 400 });
  }

  const toDateOrNull = (value: unknown): Date | null => {
    if (!value) {
      return null;
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const runUpsertTransaction = async (includePlannedFields: boolean) => {
    const existingVisits = await prisma.visit.findMany({
      where: { patientId },
    });
    const existingById = new Map(existingVisits.map((visit) => [visit.id, visit]));

    await prisma.$transaction(
      body.map((visitData: any) => {
        const visitDate = toDateOrNull(visitData.visitDate ?? visitData.date);
        const nextAppointment = toDateOrNull(visitData.nextAppointment);
        const existingVisit = Number.isFinite(Number(visitData.id))
          ? existingById.get(Number(visitData.id))
          : undefined;

        if (existingVisit) {
          return prisma.visit.update({
            where: { id: existingVisit.id },
            data: {
              visitDate: visitDate ?? existingVisit.visitDate,
              visitType: visitData.visitType ?? existingVisit.visitType,
              diagnosis: visitData.diagnosis ?? existingVisit.diagnosis,
              treatmentNotes: visitData.treatmentNotes ?? existingVisit.treatmentNotes,
              upperArch: visitData.upperArch ?? existingVisit.upperArch,
              lowerArch: visitData.lowerArch ?? existingVisit.lowerArch,
              wireType: visitData.wireType ?? existingVisit.wireType,
              elastics: visitData.elastics ?? existingVisit.elastics,
              tads: visitData.tads ?? existingVisit.tads,
              ...(includePlannedFields
                ? {
                    plannedUpperArch: visitData.plannedUpperArch ?? existingVisit.plannedUpperArch,
                    plannedLowerArch: visitData.plannedLowerArch ?? existingVisit.plannedLowerArch,
                    plannedElasticType: visitData.plannedElasticType ?? existingVisit.plannedElasticType,
                    plannedTadsNote: visitData.plannedTadsNote ?? existingVisit.plannedTadsNote,
                  }
                : {}),
              plannedTreatment: visitData.plannedTreatment ?? existingVisit.plannedTreatment,
              paymentCollected: visitData.paymentCollected ?? existingVisit.paymentCollected,
              nextAppointment: nextAppointment ?? existingVisit.nextAppointment,
              chairTime: visitData.chairTime ?? existingVisit.chairTime,
            },
          });
        }

        return prisma.visit.create({
          data: {
            patientId,
            visitDate: visitDate ?? new Date(),
            visitType: visitData.visitType ?? null,
            diagnosis: visitData.diagnosis ?? null,
            treatmentNotes: visitData.treatmentNotes ?? null,
            upperArch: visitData.upperArch ?? null,
            lowerArch: visitData.lowerArch ?? null,
            wireType: visitData.wireType ?? null,
            elastics: visitData.elastics ?? null,
            tads: visitData.tads ?? null,
            ...(includePlannedFields
              ? {
                  plannedUpperArch: visitData.plannedUpperArch ?? null,
                  plannedLowerArch: visitData.plannedLowerArch ?? null,
                  plannedElasticType: visitData.plannedElasticType ?? null,
                  plannedTadsNote: visitData.plannedTadsNote ?? null,
                }
              : {}),
            plannedTreatment: visitData.plannedTreatment ?? null,
            paymentCollected: visitData.paymentCollected ?? null,
            nextAppointment,
            chairTime: visitData.chairTime ?? null,
          },
        });
      })
    );
  };

  try {
    const hadElasticsBefore = await prisma.visit.count({
      where: {
        patientId,
        elastics: {
          not: null,
        },
      },
    });

    const hadTadsBefore = await prisma.visit.count({
      where: {
        patientId,
        tads: {
          not: null,
        },
      },
    });

    try {
      await runUpsertTransaction(true);
    } catch (error) {
      if (!isUnknownPlannedFieldError(error)) {
        throw error;
      }

      await runUpsertTransaction(false);
    }

    // Return updated visits
    const updatedVisits = await prisma.visit.findMany({
      where: { patientId },
      orderBy: { id: "desc" },
    });

    if (hadElasticsBefore === 0) {
      const firstVisitWithElastics = updatedVisits.find((visit) => hasValue(visit.elastics));
      if (firstVisitWithElastics) {
        await sendElasticsStartedNotification({
          patient,
          elasticType: firstVisitWithElastics.elastics,
          visitId: firstVisitWithElastics.id,
        });
      }
    }

    if (hadTadsBefore === 0) {
      const firstVisitWithTads = updatedVisits.find((visit) => hasValue(visit.tads));
      if (firstVisitWithTads) {
        await sendTadsStartedNotification({
          patient,
          tadsNote: firstVisitWithTads.tads,
          visitId: firstVisitWithTads.id,
        });
      }
    }

    return NextResponse.json(updatedVisits);
  } catch (error) {
    console.error('[PUT /api/patients/[id]/visits ERROR]', error);
    return NextResponse.json(
      { error: "Failed to update visits", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

