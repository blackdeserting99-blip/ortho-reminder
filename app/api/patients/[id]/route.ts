import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { getDoctorWhatsApp } from "@/app/lib/doctor-whatsapp";
import {
  buildDoctorWhatsAppCredentials,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";
import { neon } from "@neondatabase/serverless";
import { recordAuditLog } from "@/app/lib/audit";

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

const patientSchema = z.object({}).passthrough();

function getMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getCaseStatusFromMetadata(metadata: unknown) {
  const value = getMetadataObject(metadata).caseStatus;
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

function buildRetainerPatientMessage(input: {
  patientName: string;
  doctorName: string;
}) {
  return `السلام عليكم ${input.patientName} 🌹

مبارك لكم انتهاء علاج التقويم، ونتمنى لكم ابتسامة جميلة ودائمة. ✨

للحفاظ على نتيجة العلاج، يرجى الالتزام بارتداء الريتينر كما يلي:

📌 السنة الأولى:
ارتداء الريتينر لمدة 24 ساعة يومياً، ويتم نزعه فقط أثناء تناول الطعام أو شرب المشروبات الساخنة.

📌 السنة الثانية:
ارتداء الريتينر أثناء النوم فقط، أو حسب تعليمات الطبيب.

تعليمات مهمة:
✅ انزع الريتينر قبل الأكل أو الشرب (عدا الماء).
✅ نظّف الريتينر يومياً باستخدام فرشاة ناعمة وماء فاتر.
❌ تجنب استخدام الماء الساخن لأنه قد يغيّر شكل الريتينر.
✅ احتفظ به داخل علبته المخصصة عند عدم استخدامه.
❌ لا تلفّه بالمنديل أو تضعه في الجيب لتجنب فقدانه أو كسره.

في حال كسر الريتينر أو فقدانه، يرجى التواصل مع العيادة بأسرع وقت.

مع تمنياتنا لكم بدوام الصحة والابتسامة الجميلة 🌹
${input.doctorName}`;
}

function buildRetainerDoctorMessage(input: {
  patientName: string;
  patientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
}) {
  return [
    "Retainer phase transition alert.",
    `Patient: ${input.patientName}`,
    `Phone: ${input.patientPhone}`,
    `Retainer follow-up: ${input.appointmentDate} ${input.appointmentTime}`,
    "Case has been switched from active treatment to retainer phase.",
  ].join("\n");
}

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

function getRuntimeDiagnostics() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasNeonDatabaseUrl: Boolean(process.env.NEON_DATABASE_URL),
    nodeEnv: process.env.NODE_ENV || "unknown",
    runtime: process.env.NEXT_RUNTIME || "unknown",
  };
}

function jsonRouteError(context: string, error: unknown, status = 500) {
  console.error(`[${context}]`, error);
  if (error instanceof Error) {
    console.error(error.stack);
  }

  return NextResponse.json(
    {
      error: status === 500 ? "Internal Server Error" : "Request failed",
      details: error instanceof Error ? error.message : String(error),
    },
    { status }
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await getCurrentUser();
console.log("CURRENT USER:", user);
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
console.log("LOOKING FOR PATIENT:", {
  patientId,
  userId: user?.id,
});
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
      
      const metadata = getMetadataObject(patient.metadata);
      const result = {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        address: patient.address,
        occupation: patient.occupation,
        clinicName: patient.clinicName,
        clinicColor: patient.clinicColor,
        treatment: patient.treatmentCategory,
        treatmentCategory: patient.treatmentCategory,
        bracketType: patient.bracketType,
        caseSheet: patient.caseSheet,
        firstAppointment: patient.firstAppointment,
        appointmentDate,
        appointmentTime,
        totalFee: patient.totalFee,
        totalPaid: patient.totalPaid,
        plannedNotes: patient.plannedNotes,
        notes: patient.notes,
        retainerFee: patient.retainerFee,
        elasticEnabled: Boolean(patient.elasticEnabled || metadata.elasticEnabled),
        elasticType: patient.elasticType ?? (typeof metadata.elasticType === "string" ? metadata.elasticType : null),
        tadsNote: patient.tadsNote ?? (typeof metadata.tadsNote === "string" ? metadata.tadsNote : null),
        caseStatus: getCaseStatusFromMetadata(patient.metadata),
        damonTorques: typeof metadata.damonTorques === "string" ? String(metadata.damonTorques) : null,
        wireSettings: typeof metadata.wireSettings === "object" && metadata.wireSettings !== null ? metadata.wireSettings : null,
        autoReminderEnabled: metadata.autoReminderEnabled !== false,
        alignerDaysPerTray: Number(metadata.alignerDaysPerTray || 14),
        galleryPhotos: Array.isArray(metadata.galleryPhotos) ? metadata.galleryPhotos : [],
        caseSheetAttachments: Array.isArray(metadata.caseSheetAttachments) ? metadata.caseSheetAttachments : [],
        visits: visitsWithAliases,
      };

      return NextResponse.json(result);
    }

    console.log('[DEBUG][GET /api/patients/[id]] patient not found in DB for id:', patientId);
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  } catch (error) {
    console.error('========== PRISMA ERROR ==========', error);

    try {
      const sql = getSqlClient();

      const patientRows = await sql`
        SELECT p.*
        FROM "Patient" p
        WHERE p.id = ${patientId} AND p."userId" = ${user.id}
        LIMIT 1
      `;

      const patient = patientRows?.[0];
      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const visits = await sql`
        SELECT *
        FROM "Visit"
        WHERE "patientId" = ${patientId}
        ORDER BY id ASC
      `;

      const latestAppointmentRows = await sql`
        SELECT "scheduledAt"
        FROM "Appointment"
        WHERE "patientId" = ${patientId}
        ORDER BY id DESC
        LIMIT 1
      `;

      let appointmentDate = null;
      let appointmentTime = null;
      const latestVisit = visits.length > 0 ? visits[visits.length - 1] : null;
      const nextApptFromVisit = latestVisit?.nextAppointment ? new Date(latestVisit.nextAppointment) : null;
      const nextApptFromAppointment = latestAppointmentRows?.[0]?.scheduledAt
        ? new Date(latestAppointmentRows[0].scheduledAt)
        : null;
      const nextAppt = nextApptFromVisit || nextApptFromAppointment;

      if (nextAppt) {
        appointmentDate = formatDateIso(nextAppt);
        appointmentTime = formatAppointmentTime(nextAppt);
      }

      const mappedVisits = visits.map((visit: any) => {
        const visitDate = visit.visitDate ? new Date(visit.visitDate) : null;
        const nextDateValue = visit.nextAppointment ? new Date(visit.nextAppointment) : null;
        return {
          ...visit,
          date: visitDate ? formatDateIso(visitDate) : null,
          time: nextDateValue ? formatAppointmentTime(nextDateValue) : null,
          visitNotes: visit.treatmentNotes,
          plannedNotes: visit.plannedTreatment,
          payment: Number(visit.paymentCollected ?? 0),
          upperWire: visit.upperArch,
          lowerWire: visit.lowerArch,
          elasticEnabled: Boolean(visit.elastics),
          elasticType: visit.elastics,
          tadsNote: visit.tads,
          nextDate: nextDateValue ? formatDateIso(nextDateValue) : null,
          nextTime: nextDateValue ? formatAppointmentTime(nextDateValue) : null,
        };
      });

      const metadata = getMetadataObject(patient.metadata);
      return NextResponse.json({
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        address: patient.address,
        occupation: patient.occupation,
        clinicName: patient.clinicName,
        clinicColor: patient.clinicColor,
        treatment: patient.treatmentCategory,
        treatmentCategory: patient.treatmentCategory,
        bracketType: patient.bracketType,
        caseSheet: patient.caseSheet,
        firstAppointment: patient.firstAppointment,
        appointmentDate,
        appointmentTime,
        totalFee: patient.totalFee,
        totalPaid: patient.totalPaid,
        plannedNotes: patient.plannedNotes,
        notes: patient.notes,
        retainerFee: patient.retainerFee,
        elasticEnabled: patient.elasticEnabled || false,
        elasticType: patient.elasticType,
        tadsNote: patient.tadsNote,
        caseStatus: getCaseStatusFromMetadata(patient.metadata),
        damonTorques: typeof metadata.damonTorques === "string" ? String(metadata.damonTorques) : null,
        autoReminderEnabled: metadata.autoReminderEnabled !== false,
        alignerDaysPerTray: Number(metadata.alignerDaysPerTray || 14),
        galleryPhotos: Array.isArray(metadata.galleryPhotos) ? metadata.galleryPhotos : [],
        caseSheetAttachments: Array.isArray(metadata.caseSheetAttachments) ? metadata.caseSheetAttachments : [],
        visits: mappedVisits,
      });
    } catch (fallbackError) {
      console.error('========== SQL FALLBACK ERROR ==========', fallbackError);
      return NextResponse.json({ error: 'Internal Server Error', details: String(fallbackError) }, { status: 500 });
    }
  }
  } catch (error) {
    return jsonRouteError("GET /api/patients/[id]", error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  console.log("[DEBUG][PATCH /api/patients/[id]] runtime diagnostics:", getRuntimeDiagnostics());
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const sql = getSqlClient();
  const existingRows = await sql`
    SELECT
      p.*,
      c.phone AS "clinicPhone",
      c.metadata AS "clinicMetadata"
    FROM "Patient" p
    LEFT JOIN "Clinic" c ON c.id = p."clinicId"
    WHERE p.id = ${patientId} AND p."userId" = ${user.id}
    LIMIT 1
  `;

  const existingRow = existingRows?.[0] ?? null;
  const existing: any = existingRow
    ? {
        ...existingRow,
        clinic: {
          phone: existingRow.clinicPhone ?? null,
          metadata: existingRow.clinicMetadata ?? null,
        },
      }
    : null;

  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  let doctor:
    | {
        whatsappAccessToken: string | null;
        whatsappPhoneNumberId: string | null;
      }
    | null = null;
  try {
    doctor = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
      },
    });
  } catch (doctorLookupError) {
    console.error(
      "[ERROR][PATCH /api/patients/[id]] doctor WhatsApp credential lookup failed; continuing without credentials",
      doctorLookupError
    );
  }
  const doctorCredentials = await buildDoctorWhatsAppCredentials({
    whatsappAccessToken: doctor?.whatsappAccessToken,
    whatsappPhoneNumberId: doctor?.whatsappPhoneNumberId,
  });

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
  const shouldUpdateCaseStatus = Object.prototype.hasOwnProperty.call(body, "caseStatus");
  const shouldUpdateReminderSettings =
    Object.prototype.hasOwnProperty.call(body, "autoReminderEnabled") ||
    Object.prototype.hasOwnProperty.call(body, "alignerDaysPerTray");
  const shouldUpdateGalleryAttachments =
    Object.prototype.hasOwnProperty.call(body, "galleryPhotos") ||
    Object.prototype.hasOwnProperty.call(body, "caseSheetAttachments");
  const shouldUpdateWireSettings = Object.prototype.hasOwnProperty.call(body, "wireSettings");
  const shouldUpdateDamonTorques =
    Object.prototype.hasOwnProperty.call(body, "damonTorques");

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
  if (Object.prototype.hasOwnProperty.call(updatePayload, "caseStatus")) {
    delete updatePayload.caseStatus;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "autoReminderEnabled")) {
    delete updatePayload.autoReminderEnabled;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "alignerDaysPerTray")) {
    delete updatePayload.alignerDaysPerTray;
  }
  if (Object.prototype.hasOwnProperty.call(updatePayload, "damonTorques")) {
    delete updatePayload.damonTorques;
  }

  const shouldUpdateMetadata =
    shouldUpdateReminderSettings ||
    shouldUpdateCaseStatus ||
    shouldUpdateGalleryAttachments ||
    shouldUpdateDamonTorques ||
    shouldUpdateWireSettings;
  const existingMetadata = getMetadataObject(existing.metadata);

  if (shouldUpdateMetadata) {
    const previousCaseStatus = getCaseStatusFromMetadata(existingMetadata);
    const nextCaseStatusFromPayload =
      typeof incoming.caseStatus === "string"
        ? incoming.caseStatus
        : previousCaseStatus;

    const mergedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      autoReminderEnabled:
        typeof incoming.autoReminderEnabled === "boolean"
          ? incoming.autoReminderEnabled
          : existingMetadata.autoReminderEnabled !== false,
      alignerDaysPerTray:
        typeof incoming.alignerDaysPerTray === "number"
          ? incoming.alignerDaysPerTray
          : Number(existingMetadata.alignerDaysPerTray || 14),
      caseStatus:
        typeof incoming.caseStatus === "string"
          ? incoming.caseStatus
          : getCaseStatusFromMetadata(existingMetadata),
      ...(typeof incoming.galleryPhotos !== "undefined"
        ? { galleryPhotos: incoming.galleryPhotos }
        : {}),
      ...(typeof incoming.caseSheetAttachments !== "undefined"
        ? { caseSheetAttachments: incoming.caseSheetAttachments }
        : {}),
      ...(typeof incoming.damonTorques !== "undefined"
        ? { damonTorques: incoming.damonTorques }
        : {}),
      ...(typeof incoming.wireSettings !== "undefined"
        ? { wireSettings: incoming.wireSettings }
        : {}),
    };

    if (typeof incoming.bracketType === "string" && incoming.bracketType !== "Damon System") {
      delete mergedMetadata.damonTorques;
    }

    updatePayload.metadata = mergedMetadata;
  }

  const hasTotalFee = Object.prototype.hasOwnProperty.call(updatePayload, "totalFee");
  const hasTotalPaid = Object.prototype.hasOwnProperty.call(updatePayload, "totalPaid");
      const hasRetainerFee = Object.prototype.hasOwnProperty.call(updatePayload, "retainerFee");
      const hasElasticEnabled = Object.prototype.hasOwnProperty.call(updatePayload, "elasticEnabled");
      const hasElasticType = Object.prototype.hasOwnProperty.call(updatePayload, "elasticType");
      const hasTadsNote = Object.prototype.hasOwnProperty.call(updatePayload, "tadsNote");
      const hasMyofunctionalType = Object.prototype.hasOwnProperty.call(updatePayload, "myofunctionalType");
      const hasMyofunctionalProgram = Object.prototype.hasOwnProperty.call(updatePayload, "myofunctionalProgram");
      const hasClearAlignersPlan = Object.prototype.hasOwnProperty.call(updatePayload, "clearAlignersPlan");
      const hasClinicName = Object.prototype.hasOwnProperty.call(updatePayload, "clinicName");
      const hasClinicColor = Object.prototype.hasOwnProperty.call(updatePayload, "clinicColor");
      const hasAge = Object.prototype.hasOwnProperty.call(updatePayload, "age");
      const hasDateOfBirth = Object.prototype.hasOwnProperty.call(updatePayload, "dateOfBirth");
      const hasGender = Object.prototype.hasOwnProperty.call(updatePayload, "gender");
      const hasMetadata = Object.prototype.hasOwnProperty.call(updatePayload, "metadata");

      await sql`
        UPDATE "Patient"
        SET
          name = CASE WHEN ${hasName} THEN ${updatePayload.name ?? null} ELSE name END,
          phone = CASE WHEN ${hasPhone} THEN ${updatePayload.phone ?? null} ELSE phone END,
          address = CASE WHEN ${hasAddress} THEN ${updatePayload.address ?? null} ELSE address END,
          occupation = CASE WHEN ${hasOccupation} THEN ${updatePayload.occupation ?? null} ELSE occupation END,
          "treatmentCategory" = CASE WHEN ${hasTreatmentCategory} THEN ${updatePayload.treatmentCategory ?? null} ELSE "treatmentCategory" END,
          "bracketType" = CASE WHEN ${hasBracketType} THEN ${updatePayload.bracketType ?? null} ELSE "bracketType" END,
          "caseSheet" = CASE WHEN ${hasCaseSheet} THEN ${updatePayload.caseSheet ?? null} ELSE "caseSheet" END,
          "firstAppointment" = CASE WHEN ${hasFirstAppointment} THEN ${updatePayload.firstAppointment ?? false} ELSE "firstAppointment" END,
          notes = CASE WHEN ${hasNotes} THEN ${updatePayload.notes ?? null} ELSE notes END,
          "plannedNotes" = CASE WHEN ${hasPlannedNotes} THEN ${updatePayload.plannedNotes ?? null} ELSE "plannedNotes" END,
          "totalFee" = CASE WHEN ${hasTotalFee} THEN ${updatePayload.totalFee ?? null} ELSE "totalFee" END,
          "totalPaid" = CASE WHEN ${hasTotalPaid} THEN ${updatePayload.totalPaid ?? null} ELSE "totalPaid" END,
          "retainerFee" = CASE WHEN ${hasRetainerFee} THEN ${updatePayload.retainerFee ?? null} ELSE "retainerFee" END,
          "elasticEnabled" = CASE WHEN ${hasElasticEnabled} THEN ${updatePayload.elasticEnabled ?? false} ELSE "elasticEnabled" END,
          "elasticType" = CASE WHEN ${hasElasticType} THEN ${updatePayload.elasticType ?? null} ELSE "elasticType" END,
          "tadsNote" = CASE WHEN ${hasTadsNote} THEN ${updatePayload.tadsNote ?? null} ELSE "tadsNote" END,
          "myofunctionalType" = CASE WHEN ${hasMyofunctionalType} THEN ${updatePayload.myofunctionalType ?? null} ELSE "myofunctionalType" END,
          "myofunctionalProgram" = CASE WHEN ${hasMyofunctionalProgram} THEN ${updatePayload.myofunctionalProgram ?? null} ELSE "myofunctionalProgram" END,
          "clearAlignersPlan" = CASE WHEN ${hasClearAlignersPlan} THEN ${updatePayload.clearAlignersPlan ?? null} ELSE "clearAlignersPlan" END,
          "clinicName" = CASE WHEN ${hasClinicName} THEN ${updatePayload.clinicName ?? null} ELSE "clinicName" END,
          "clinicColor" = CASE WHEN ${hasClinicColor} THEN ${updatePayload.clinicColor ?? null} ELSE "clinicColor" END,
          age = CASE WHEN ${hasAge} THEN ${updatePayload.age ?? null} ELSE age END,
          "dateOfBirth" = CASE WHEN ${hasDateOfBirth} THEN ${updatePayload.dateOfBirth ? new Date(updatePayload.dateOfBirth) : null} ELSE "dateOfBirth" END,
          gender = CASE WHEN ${hasGender} THEN ${updatePayload.gender ?? null} ELSE gender END,
          metadata = CASE WHEN ${hasMetadata} THEN ${updatePayload.metadata ?? null} ELSE metadata END,
          "updatedAt" = ${new Date()}
        WHERE id = ${patientId} AND "userId" = ${user.id}
      `;

      if (shouldUpdateAppointment) {
        const latestVisitRows = await sql`
          SELECT id
          FROM "Visit"
          WHERE "patientId" = ${patientId}
          ORDER BY id DESC
          LIMIT 1
        `;
        const latestAppointmentRows = await sql`
          SELECT id
          FROM "Appointment"
          WHERE "patientId" = ${patientId}
          ORDER BY id DESC
          LIMIT 1
        `;

        const latestVisitId = latestVisitRows?.[0]?.id ?? null;
        const latestAppointmentId = latestAppointmentRows?.[0]?.id ?? null;

        const appointmentDateValue = typeof incoming.appointmentDate === "string"
          ? incoming.appointmentDate.trim()
          : "";

        if (!appointmentDateValue) {
          if (latestVisitId) {
            await sql`
              UPDATE "Visit"
              SET "nextAppointment" = NULL,
                  "updatedAt" = ${new Date()}
              WHERE id = ${latestVisitId}
            `;
          }
          if (latestAppointmentId) {
            await sql`
              UPDATE "Appointment"
              SET status = ${"CANCELED"},
                  "updatedAt" = ${new Date()}
              WHERE id = ${latestAppointmentId}
            `;
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

          if (latestVisitId) {
            await sql`
              UPDATE "Visit"
              SET "nextAppointment" = ${appointmentDateTime},
                  "updatedAt" = ${new Date()}
              WHERE id = ${latestVisitId}
            `;
          }

          if (latestAppointmentId) {
            await sql`
              UPDATE "Appointment"
              SET "scheduledAt" = ${appointmentDateTime},
                  status = ${"SCHEDULED"},
                  "updatedAt" = ${new Date()}
              WHERE id = ${latestAppointmentId}
            `;
          } else {
            await sql`
              INSERT INTO "Appointment" (
                "patientId",
                "scheduledAt",
                status,
                type,
                "createdAt",
                "updatedAt"
              ) VALUES (
                ${patientId},
                ${appointmentDateTime},
                ${"SCHEDULED"},
                ${"Regular"},
                ${new Date()},
                ${new Date()}
              )
            `;
          }
        }
      }

      const reloadedRows = await sql`
        SELECT *
        FROM "Patient"
        WHERE id = ${patientId} AND "userId" = ${user.id}
        LIMIT 1
      `;
      const reloaded = reloadedRows?.[0];
      if (!reloaded) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      const metadata = getMetadataObject(reloaded.metadata);

      return NextResponse.json({
        id: reloaded.id,
        name: reloaded.name,
        phone: reloaded.phone,
        age: reloaded.age,
        address: reloaded.address,
        occupation: reloaded.occupation,
        clinicName: reloaded.clinicName,
        clinicColor: reloaded.clinicColor,
        treatment: reloaded.treatmentCategory,
        treatmentCategory: reloaded.treatmentCategory,
        bracketType: reloaded.bracketType,
        caseSheet: reloaded.caseSheet,
        firstAppointment: reloaded.firstAppointment,
        appointmentDate: null,
        appointmentTime: null,
        totalFee: reloaded.totalFee,
        totalPaid: reloaded.totalPaid,
        plannedNotes: reloaded.plannedNotes,
        notes: reloaded.notes,
        retainerFee: reloaded.retainerFee,
        elasticEnabled: Boolean(reloaded.elasticEnabled || metadata.elasticEnabled),
        elasticType: reloaded.elasticType ?? (typeof metadata.elasticType === "string" ? metadata.elasticType : null),
        tadsNote: reloaded.tadsNote ?? (typeof metadata.tadsNote === "string" ? metadata.tadsNote : null),
        caseStatus: getCaseStatusFromMetadata(reloaded.metadata),
        damonTorques: typeof metadata.damonTorques === "string" ? String(metadata.damonTorques) : null,
        wireSettings: typeof metadata.wireSettings === "object" && metadata.wireSettings !== null ? metadata.wireSettings : null,
        autoReminderEnabled: metadata.autoReminderEnabled !== false,
        alignerDaysPerTray: Number(metadata.alignerDaysPerTray || 14),
        galleryPhotos: Array.isArray(metadata.galleryPhotos) ? metadata.galleryPhotos : [],
        caseSheetAttachments: Array.isArray(metadata.caseSheetAttachments) ? metadata.caseSheetAttachments : [],
      });
    } catch (fallbackError) {
      console.error("[PATCH /api/patients/[id] SQL FALLBACK ERROR]", fallbackError);
      return NextResponse.json(
        {
          error: "Failed to update patient",
          details:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        },
        { status: 500 }
      );
    }
  }
  } catch (error) {
    return jsonRouteError("PATCH /api/patients/[id]", error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const sql = getSqlClient();
  const existingRows = await sql`
    SELECT id
    FROM "Patient"
    WHERE id = ${patientId} AND "userId" = ${user.id}
    LIMIT 1
  `;

  if (!existingRows?.[0]) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  await sql`
    DELETE FROM "Patient"
    WHERE id = ${patientId} AND "userId" = ${user.id}
  `;

  await recordAuditLog({
    userId: user.id,
    action: "DOCTOR_DELETED_PATIENT",
    targetType: "PATIENT",
    targetId: String(patientId),
  });

  return NextResponse.json({ success: true });
  } catch (error) {
    return jsonRouteError("DELETE /api/patients/[id]", error);
  }
}
