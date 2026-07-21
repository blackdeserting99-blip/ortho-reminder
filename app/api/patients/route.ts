import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_APPOINTMENT_TIME = "04:00 PM";

function formatDateIso(date: Date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function formatAppointmentTime(date: Date) {
  const h = date.getHours();
  const mi = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(mi).padStart(2, "0")} ${period}`;
}

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

const patientSchema = z.object({
  // Only require the patient name. Everything else is optional.
  name: z.string().min(1, "Patient name is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
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
  caseStatus: z.enum(["active", "retainer", "finished", "cancelled", "archived"]).optional(),
});

function getCaseStatusFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "active" as const;
  }

  const value = (metadata as Record<string, unknown>).caseStatus;
  if (
    value === "active" ||
    value === "retainer" ||
    value === "finished" ||
    value === "cancelled" ||
    value === "archived"
  ) {
    return value;
  }

  return "active" as const;
}

export async function GET() {
  try {
    console.log("STEP 1", "GET /api/patients start");

    const user = await getCurrentUser();
    console.log("STEP 2", user);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("STEP 3", "user authenticated, querying patients");

    const patients = await prisma.patient.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        visits: {
          orderBy: [{ id: 'desc' }],
          take: 1,
        },
        appointments: {
          orderBy: [{ id: "desc" }],
          take: 1,
        },
      },
    });

    const patientsWithAppointment = patients.map((patient) => {
      let appointmentDate = null;
      let appointmentTime = null;
      const nextApptFromVisit = patient.visits?.[0]?.nextAppointment;
      const nextApptFromAppointment = patient.appointments?.[0]?.scheduledAt;
      const nextAppt = nextApptFromVisit || nextApptFromAppointment;

      if (nextAppt) {
        appointmentDate = formatDateIso(nextAppt);
        appointmentTime = formatAppointmentTime(nextAppt);
      }

      return {
        ...patient,
        caseStatus: getCaseStatusFromMetadata(patient.metadata),
        treatment: patient.treatmentCategory,
        visits: (patient.visits || []).map((visit) => ({
          ...visit,
          date: formatDateIso(visit.visitDate),
          time: visit.nextAppointment ? formatAppointmentTime(visit.nextAppointment) : null,
          visitNotes: visit.treatmentNotes,
          plannedNotes: visit.plannedTreatment,
          payment: Number(visit.paymentCollected ?? 0),
          upperWire: visit.upperArch,
          lowerWire: visit.lowerArch,
          elasticEnabled: Boolean(visit.elastics),
          elasticType: visit.elastics,
          tadsNote: visit.tads,
        })),
        appointmentDate,
        appointmentTime,
      };
    });

    return NextResponse.json(patientsWithAppointment);
  } catch (error) {
    console.error("PATIENT API ERROR");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.stack);
    }

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("STEP 1", "POST /api/patients start");

    const user = await getCurrentUser();
    console.log("STEP 2", user);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[DEBUG][POST /api/patients] authenticated user id:', user.id);

    console.log("STEP 3");
    const body = await request.json().catch(() => null);
    console.log("STEP 4", body);

    if (!body) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const parseResult = patientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
    }

    console.log("STEP 5", parseResult.data);

    const treatmentCategory =
      parseResult.data.treatmentCategory ?? parseResult.data.treatment ?? null;
    const appointmentDateTime = parseAppointmentDateTime(
      parseResult.data.appointmentDate,
      parseResult.data.appointmentTime
    );

    if (parseResult.data.appointmentDate && !appointmentDateTime) {
      return NextResponse.json(
        { error: "Invalid appointment date or time." },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        // Provide defaults for DB-required fields when absent in the request.
        name: parseResult.data.name,
        phone: parseResult.data.phone ?? "",
        dateOfBirth: parseResult.data.dateOfBirth ? new Date(parseResult.data.dateOfBirth) : null,
        gender: parseResult.data.gender ?? null,
        address: parseResult.data.address ?? null,
        occupation: parseResult.data.occupation ?? null,
        treatmentCategory,
        bracketType: parseResult.data.bracketType ?? null,
        caseSheet: parseResult.data.caseSheet ?? null,
        firstAppointment: parseResult.data.firstAppointment ?? false,
        notes: parseResult.data.notes ?? null,
        plannedNotes: parseResult.data.plannedNotes ?? null,
        totalFee: parseResult.data.totalFee ?? null,
        retainerFee: parseResult.data.retainerFee ?? null,
        elasticEnabled: parseResult.data.elasticEnabled ?? false,
        elasticType: parseResult.data.elasticType ?? null,
        tadsNote: parseResult.data.tadsNote ?? null,
        myofunctionalType: parseResult.data.myofunctionalType ?? null,
        myofunctionalProgram: parseResult.data.myofunctionalProgram ?? null,
        clearAlignersPlan: parseResult.data.clearAlignersPlan ?? null,
        metadata: {
          caseStatus: parseResult.data.caseStatus || "active",
        },
      },
    });

    if (appointmentDateTime) {
      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          scheduledAt: appointmentDateTime,
          status: "SCHEDULED",
          type: "Initial Consultation",
        },
      });
    }

    console.log('[DEBUG][POST /api/patients] created patient object:', patient);

    const responsePayload = { ...patient, id: patient.id, userId: patient.userId };
    console.log('[DEBUG][POST /api/patients] response id:', responsePayload.id);

    // Return the created patient explicitly including id and userId to avoid
    // any client-side ambiguity about the returned shape.
    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error("PATIENT API ERROR");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.stack);
    }

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
