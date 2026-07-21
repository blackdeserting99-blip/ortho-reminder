import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_APPOINTMENT_TIME = "04:00 PM";

function parseAppointmentDateTime(dateValue?: string, timeValue?: string) {
  const date = (dateValue || "").trim();
  if (!date) return null;

  const rawTime = (timeValue || DEFAULT_APPOINTMENT_TIME).trim();
  const withMeridian = rawTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const hhmm = rawTime.match(/^(\d{1,2}):(\d{2})$/);

  let hours = 16;
  let minutes = 0;

  if (withMeridian) {
    let parsedHours = Number(withMeridian[1]);
    minutes = Number(withMeridian[2]);
    const meridian = withMeridian[3].toUpperCase();
    if (meridian === "PM" && parsedHours !== 12) parsedHours += 12;
    if (meridian === "AM" && parsedHours === 12) parsedHours = 0;
    hours = parsedHours;
  } else if (hhmm) {
    hours = Number(hhmm[1]);
    minutes = Number(hhmm[2]);
  }

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const dateTime = new Date(
    `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
  );

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
}

function formatAppointmentTime(date: Date) {
  const h = date.getHours();
  const mi = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(mi).padStart(2, "0")} ${period}`;
}

function formatDateIso(date: Date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function isPlaceholderVisit(visit: {
  treatmentNotes: string | null;
  upperArch: string | null;
  lowerArch: string | null;
  elastics: string | null;
  tads: string | null;
  plannedUpperArch: string | null;
  plannedLowerArch: string | null;
  plannedElasticType: string | null;
  plannedTadsNote: string | null;
  plannedTreatment: string | null;
  paymentCollected: unknown;
}) {
  const hasClinicalData = Boolean(
    visit.treatmentNotes ||
      visit.upperArch ||
      visit.lowerArch ||
      visit.elastics ||
      visit.tads ||
      visit.plannedUpperArch ||
      visit.plannedLowerArch ||
      visit.plannedElasticType ||
      visit.plannedTadsNote ||
      visit.plannedTreatment
  );
  const hasPayment = visit.paymentCollected !== null && visit.paymentCollected !== undefined;
  return !hasClinicalData && !hasPayment;
}

const patientSchema = z.object({
  name: z.string().min(1, "Patient name is required").optional(),
  phone: z.string().min(1, "Contact number is required").optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  treatment: z.string().optional(),
  treatmentCategory: z.string().optional(),
  bracketType: z.string().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  caseSheet: z.string().optional(),
  firstAppointment: z.boolean().optional(),
  notes: z.string().optional(),
  plannedNotes: z.string().optional(),
  totalFee: z.number().nonnegative().optional(),
  retainerFee: z.number().nonnegative().optional(),
  elasticEnabled: z.boolean().optional(),
  elasticType: z.string().optional(),
  tadsNote: z.string().optional(),
  myofunctionalType: z.string().optional(),
  myofunctionalProgram: z.any().optional(),
  clearAlignersPlan: z.any().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  console.log('[DEBUG][GET /api/patients/[id]] params.id:', id);
  console.log('[DEBUG][GET /api/patients/[id]] authenticated user id:', user.id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  // Query for patient owned by this user
  try {
const patient = await prisma.patient.findFirst({
  where: {
    id: patientId,
    userId: user.id,
  },
  include: {
    visits: {
      orderBy: [{ id: 'asc' }],
    },
    appointments: {
      orderBy: [{ id: "desc" }],
      take: 1,
    },
  },
});
    if (patient) {
      console.log('[DEBUG][GET /api/patients/[id]] found patient for user:', user.id, 'patientId:', patient.id);
      
      // Calculate next appointment from latest visit/appointment
      let appointmentDate = null;
      let appointmentTime = null;

      const latestVisit = patient.visits.length > 0 ? patient.visits[patient.visits.length - 1] : null;
      const nextApptFromVisit = latestVisit?.nextAppointment || null;
      const nextApptFromAppointment = patient.appointments?.[0]?.scheduledAt || null;
      const nextAppt = nextApptFromVisit || nextApptFromAppointment;

      if (nextAppt) {
        appointmentDate = formatDateIso(nextAppt);
        appointmentTime = formatAppointmentTime(nextAppt);
      }

      const hasMeaningfulVisit = patient.visits.some((visit) => !isPlaceholderVisit(visit));
      const filteredVisits = hasMeaningfulVisit
        ? patient.visits.filter((visit) => !isPlaceholderVisit(visit))
        : patient.visits;

      const visitsWithAliases = filteredVisits.map((visit) => {
        const nextDate = visit.nextAppointment ? formatDateIso(visit.nextAppointment) : null;
        const nextTime = visit.nextAppointment ? formatAppointmentTime(visit.nextAppointment) : null;

        return {
          ...visit,
          date: formatDateIso(visit.visitDate),
          time: nextTime,
          visitNotes: visit.treatmentNotes,
          plannedNotes: visit.plannedTreatment,
          payment: Number(visit.paymentCollected ?? 0),
          upperWire: visit.upperArch,
          lowerWire: visit.lowerArch,
          elasticEnabled: Boolean(visit.elastics),
          elasticType: visit.elastics,
          tadsNote: visit.tads,
          nextDate,
          nextTime,
        };
      });
      
      const result = {
        ...patient,
        treatment: patient.treatmentCategory,
        visits: visitsWithAliases,
        appointmentDate,
        appointmentTime,
      };
      
      return NextResponse.json(result);
    }

    // Not found under the current user. Check fallback by id to log details.
    const fallback = await prisma.patient.findUnique({ where: { id: patientId } });
    if (fallback) {
      console.log('[DEBUG][GET /api/patients/[id]] ownership mismatch: patient found but userId differs. patientId:', fallback.id, 'patient.userId:', (fallback as any).userId);
      return NextResponse.json(fallback);
    }

    console.log('[DEBUG][GET /api/patients/[id]] patient not found in DB for id:', patientId);
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  } catch (error) {
    console.error('========== PRISMA ERROR ==========', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parseResult = patientSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
  }

  // Handle relational 'visits' field specially. Visits should be managed via
  // the PUT /api/patients/{id}/visits endpoint. Just update patient scalar fields.

  const incoming = parseResult.data as any;
  const hasAppointmentDateInPayload = Object.prototype.hasOwnProperty.call(
    body,
    "appointmentDate"
  );
  const hasAppointmentTimeInPayload = Object.prototype.hasOwnProperty.call(
    body,
    "appointmentTime"
  );
  const shouldUpdateAppointment =
    hasAppointmentDateInPayload || hasAppointmentTimeInPayload;

  // Remove visits from update payload so we can safely update patient scalars
  const updatePayload: any = { ...incoming };
  if (updatePayload.visits) delete updatePayload.visits;
  if (updatePayload.treatment && !updatePayload.treatmentCategory) {
    updatePayload.treatmentCategory = updatePayload.treatment;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "treatment")) {
    delete updatePayload.treatment;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "appointmentDate")) {
    delete updatePayload.appointmentDate;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "appointmentTime")) {
    delete updatePayload.appointmentTime;
  }

  try {
    // Update patient scalar fields
    await prisma.patient.update({ where: { id: patientId }, data: updatePayload });

    if (shouldUpdateAppointment) {
      const latestVisit = await prisma.visit.findFirst({
        where: { patientId },
        orderBy: { id: "desc" },
      });
      const latestAppointment = await prisma.appointment.findFirst({
        where: { patientId },
        orderBy: { id: "desc" },
      });

      const appointmentDateValue = typeof incoming.appointmentDate === "string"
        ? incoming.appointmentDate.trim()
        : "";

      if (!appointmentDateValue) {
        if (latestVisit) {
          await prisma.visit.update({
            where: { id: latestVisit.id },
            data: { nextAppointment: null },
          });
        }
        if (latestAppointment) {
          await prisma.appointment.update({
            where: { id: latestAppointment.id },
            data: { status: "CANCELED" },
          });
        }
      } else {
        const appointmentDateTime = parseAppointmentDateTime(
          appointmentDateValue,
          incoming.appointmentTime
        );

        if (!appointmentDateTime) {
          return NextResponse.json(
            { error: "Invalid appointment date or time." },
            { status: 400 }
          );
        }

        if (latestVisit) {
          await prisma.visit.update({
            where: { id: latestVisit.id },
            data: { nextAppointment: appointmentDateTime },
          });
        }

        if (latestAppointment) {
          await prisma.appointment.update({
            where: { id: latestAppointment.id },
            data: {
              scheduledAt: appointmentDateTime,
              status: "SCHEDULED",
            },
          });
        } else {
          await prisma.appointment.create({
            data: {
              patientId,
              scheduledAt: appointmentDateTime,
              status: "SCHEDULED",
              type: "Regular",
            },
          });
        }
      }
    }

    // Return the updated patient including visits
    const reloaded = await prisma.patient.findUnique({
      where: {
        id: patientId,
      },
      include: {
        visits: true,
      },
    });
    return NextResponse.json(reloaded);
  } catch (error) {
    console.error('[PATCH /api/patients/[id] ERROR]', error);
    return NextResponse.json(
      { error: "Failed to update patient", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  await prisma.patient.delete({ where: { id: patientId } });

  return NextResponse.json({ success: true });
}
