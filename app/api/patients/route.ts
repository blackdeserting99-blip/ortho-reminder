import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { neon } from "@neondatabase/serverless";
import { recordAuditLog } from "@/app/lib/audit";
import {
  buildDoctorWhatsAppCredentials,
  buildFirstAppointmentConfirmationMessage,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

const DEFAULT_APPOINTMENT_TIME = "04:00 PM";

function formatDateIso(date: Date | string | null | undefined) {
  const parsed = date instanceof Date ? date : date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getFullYear();
  const mo = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function formatAppointmentTime(date: Date | string | null | undefined) {
  const parsed = date instanceof Date ? date : date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  const h = parsed.getHours();
  const mi = parsed.getMinutes();
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

const patientSchema = z.object({}).passthrough();

function getMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null") return null;
    const normalized = trimmed.replace(/,/g, "");
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? Math.trunc(numericValue) : null;
  }

  return null;
}

function normalizeOptionalFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null") return null;
    const normalized = trimmed.replace(/,/g, "");
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

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

function getSqlClient() {
  const connectionString =
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL/NEON_DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

function getRuntimeDiagnostics() {
  return {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasNeonDatabaseUrl: Boolean(process.env.NEON_DATABASE_URL),
    nodeEnv: process.env.NODE_ENV || "unknown",
    runtime: process.env.NEXT_RUNTIME || "unknown",
    hasSessionSecret: Boolean(
      process.env.SESSION_SECRET ||
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET
    ),
  };
}

async function getDoctorWhatsAppSettings(userId: string) {
  try {
    const { prisma } = await import("@/app/lib/prisma");
    const doctor = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
      },
    });
    if (doctor) {
      return doctor;
    }
  } catch {
    // Fall back to raw SQL below for Cloudflare worker compatibility.
  }

  try {
    const sql = getSqlClient();
    const rows = await sql`
      SELECT
        "whatsappAccessToken",
        "whatsappPhoneNumberId",
        "whatsappBusinessAccountId"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;
    const row = rows?.[0];
    if (!row) {
      return null;
    }
    return {
      whatsappAccessToken: row.whatsappAccessToken ?? null,
      whatsappPhoneNumberId: row.whatsappPhoneNumberId ?? null,
      whatsappBusinessAccountId: row.whatsappBusinessAccountId ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // IMPORTANT: this route uses raw SQL via the neon() client, NOT prisma.patient.findMany().
    // In this Cloudflare Worker deployment, Prisma's typed query engine (findMany/include)
    // fails with "no such file or directory ... query_compiler_bg.wasm" - the compiled
    // query-planner file isn't present in the deployed bundle. Raw SQL bypasses that
    // engine entirely and is what already works reliably elsewhere in this app
    // (getCurrentUser's fallback, /api/register, /api/login all use the same raw client).
    const sql = getSqlClient();
    const patientRows: any[] = await sql`
      SELECT p.*
      FROM "Patient" p
      WHERE p."userId" = ${user.id}
      ORDER BY p."createdAt" DESC
    `;

    const patientRowsList = Array.isArray(patientRows) ? patientRows : [];
    const patientIds = patientRowsList.map((row) => row?.id).filter((id) => id !== null && id !== undefined);

    let appointmentRows: any[] = [];
    if (patientIds.length > 0) {
      appointmentRows = await sql`
        SELECT *
        FROM "Appointment" a
        WHERE a."patientId" = ANY(${patientIds})
        ORDER BY a."scheduledAt" DESC
      `;
    }

    const appointmentsByPatient = new Map<number, any[]>();
    for (const appointment of appointmentRows) {
      const patientId = Number(appointment?.patientId);
      if (!Number.isFinite(patientId)) continue;
      const list = appointmentsByPatient.get(patientId) ?? [];
      list.push(appointment);
      appointmentsByPatient.set(patientId, list);
    }

    const patients = patientRowsList.map((row: any) => {
      try {
        const patientId = Number(row?.id);
        const appointmentList = Number.isFinite(patientId)
          ? appointmentsByPatient.get(patientId) ?? []
          : [];
        const latestAppointment = appointmentList[0] ?? null;

        return {
          ...row,
          visits: [],
          appointments: latestAppointment
            ? [{ scheduledAt: new Date(latestAppointment.scheduledAt) }]
            : [],
        };
      } catch (rowError) {
        console.error("PATIENT LIST ROW NORMALIZATION FAILED", row?.id);
        console.error(rowError);
        return {
          ...(row || {}),
          visits: [],
          appointments: [],
        };
      }
    });

    const patientsWithAppointment = patients.map((patient) => {
      try {
        const safePatient = patient && typeof patient === "object" ? patient : {};
        let appointmentDate = null;
        let appointmentTime = null;
        const nextApptFromVisit = safePatient.visits?.[0]?.nextAppointment;
        const nextApptFromAppointment = safePatient.appointments?.[0]?.scheduledAt;
        const nextAppt = nextApptFromVisit || nextApptFromAppointment;

        if (nextAppt) {
          appointmentDate = formatDateIso(nextAppt);
          appointmentTime = formatAppointmentTime(nextAppt);
        }

        const normalizedVisits = Array.isArray(safePatient.visits) ? safePatient.visits : [];

        return {
          ...safePatient,
          caseStatus: getCaseStatusFromMetadata(safePatient.metadata),
          treatment: safePatient.treatmentCategory ?? safePatient.treatment ?? null,
          visits: normalizedVisits.map((visit: any) => ({
            ...visit,
            date: formatDateIso(visit?.visitDate),
            time: formatAppointmentTime(visit?.nextAppointment),
            visitNotes: visit?.treatmentNotes ?? visit?.visitNotes ?? null,
            plannedNotes: visit?.plannedTreatment ?? visit?.plannedNotes ?? null,
            payment: Number(visit?.paymentCollected ?? visit?.payment ?? 0),
            upperWire: visit?.upperArch ?? visit?.upperWire ?? null,
            lowerWire: visit?.lowerArch ?? visit?.lowerWire ?? null,
            elasticEnabled: Boolean(visit?.elastics ?? visit?.elasticEnabled),
            elasticType: visit?.elastics ?? visit?.elasticType ?? null,
            tadsNote: visit?.tads ?? visit?.tadsNote ?? null,
          })),
          appointmentDate,
          appointmentTime,
        };
      } catch (perPatientError) {
        // Never let one malformed patient/visit row take down the whole list
        console.error("PATIENT LIST ROW MAPPING FAILED", patient?.id);
        console.error(perPatientError);
        return {
          ...(patient || {}),
          caseStatus: getCaseStatusFromMetadata((patient || {}).metadata),
          treatment: (patient || {}).treatmentCategory ?? (patient || {}).treatment ?? null,
          visits: [],
          appointmentDate: null,
          appointmentTime: null,
        };
      }
    });

    return NextResponse.json(patientsWithAppointment);
  } catch (error) {
    console.error("PATIENT API ERROR");
    console.error(error);
    if (error instanceof Error) {
      console.error(error.stack);
    }

    // Graceful fallback: if the data layer hiccups or a patient row is malformed,
    // keep the dashboard/list usable by returning an empty list instead of a 500.
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("STEP 1", "POST /api/patients start");
    console.log(
      "[DEBUG][POST /api/patients] runtime diagnostics:",
      getRuntimeDiagnostics()
    );

    const user = await getCurrentUser();
    console.log("STEP 2", user);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[DEBUG][POST /api/patients] authenticated user id:', user.id);

    console.log("STEP 3");
    const bodyText = await request.text();
    let body: unknown = null;

    try {
      body = JSON.parse(bodyText);
    } catch {
      try {
        const fixedBody = bodyText
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
          .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (match, value, end) => {
            if (value === "true" || value === "false" || value === "null" || !isNaN(value)) {
              return `:${value}${end}`;
            }
            return `:"${value}"${end}`;
          });
        body = JSON.parse(fixedBody);
      } catch {
        body = null;
      }
    }
    console.log("STEP 4", body);

    if (!body) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const parseResult = patientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
    }

    const data = parseResult.data as Record<string, any>;
    console.log("STEP 5", data);

    const normalizedName = (data.name || "").trim() || "Unnamed Patient";
    const normalizedAge = normalizeOptionalInteger(data.age);
    const normalizedTotalFee = normalizeOptionalFloat(data.totalFee);
    const normalizedTotalPaid = normalizeOptionalFloat(data.totalPaid);
    const normalizedRetainerFee = normalizeOptionalFloat(data.retainerFee);

    const treatmentCategory = data.treatmentCategory ?? data.treatment ?? null;
    const autoReminderEnabled = data.autoReminderEnabled !== false;
    const alignerDaysPerTray = data.alignerDaysPerTray ?? 14;
    const appointmentDateTime = parseAppointmentDateTime(
      data.appointmentDate,
      data.appointmentTime
    );

    if (data.appointmentDate && !appointmentDateTime) {
      return NextResponse.json(
        { error: "Invalid appointment date or time." },
        { status: 400 }
      );
    }

    let patient: any;
    let usedSqlFallback = false;
    try {
      patient = await prisma.patient.create({
        data: {
          userId: user.id,
          // Provide defaults for DB-required fields when absent in the request.
          name: normalizedName,
          phone: data.phone ?? "",
          age: normalizedAge,
          clinicName: data.clinicName ?? null,
          clinicColor: data.clinicColor ?? null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender ?? null,
          address: data.address ?? null,
          occupation: data.occupation ?? null,
          treatmentCategory,
          bracketType: data.bracketType ?? null,
          caseSheet: data.caseSheet ?? null,
          firstAppointment: data.firstAppointment ?? false,
          notes: data.notes ?? null,
          plannedNotes: data.plannedNotes ?? null,
          totalFee: normalizedTotalFee,
          totalPaid: normalizedTotalPaid,
          retainerFee: normalizedRetainerFee,
          elasticEnabled: data.elasticEnabled ?? false,
          elasticType: data.elasticType ?? null,
          tadsNote: data.tadsNote ?? null,
          myofunctionalType: data.myofunctionalType ?? null,
          myofunctionalProgram: data.myofunctionalProgram ?? null,
          clearAlignersPlan: data.clearAlignersPlan ?? null,
          metadata: {
            caseStatus: data.caseStatus || "active",
            autoReminderEnabled,
            alignerDaysPerTray,
            ...(typeof data.galleryPhotos !== "undefined"
              ? { galleryPhotos: data.galleryPhotos }
              : {}),
            ...(typeof data.caseSheetAttachments !== "undefined"
              ? { caseSheetAttachments: data.caseSheetAttachments }
              : {}),
            ...(typeof data.damonTorques !== "undefined"
              ? { damonTorques: data.damonTorques }
              : {}),
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
    } catch (prismaError) {
      console.error(
        "[ERROR][POST /api/patients] prisma create path failed; attempting SQL fallback",
        prismaError
      );
      const sql = getSqlClient();
      usedSqlFallback = true;

      const inserted = await sql`
        INSERT INTO "Patient" (
          "userId",
          name,
          phone,
          age,
          "clinicName",
          "clinicColor",
          "treatmentStatus",
          "dateOfBirth",
          gender,
          address,
          occupation,
          "treatmentCategory",
          "bracketType",
          "caseSheet",
          "firstAppointment",
          notes,
          "plannedNotes",
          "totalFee",
          "totalPaid",
          "retainerFee",
          "elasticEnabled",
          "elasticType",
          "tadsNote",
          "myofunctionalType",
          "myofunctionalProgram",
          "clearAlignersPlan",
          metadata,
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${user.id},
          ${normalizedName},
          ${data.phone ?? ""},
          ${normalizedAge ?? null},
          ${data.clinicName ?? null},
          ${data.clinicColor ?? null},
          ${"PLANNED"},
          ${data.dateOfBirth ? new Date(data.dateOfBirth) : null},
          ${data.gender ?? null},
          ${data.address ?? null},
          ${data.occupation ?? null},
          ${treatmentCategory},
          ${data.bracketType ?? null},
          ${data.caseSheet ?? null},
          ${data.firstAppointment ?? false},
          ${data.notes ?? null},
          ${data.plannedNotes ?? null},
          ${normalizedTotalFee ?? null},
          ${normalizedTotalPaid ?? null},
          ${normalizedRetainerFee ?? null},
          ${data.elasticEnabled ?? false},
          ${data.elasticType ?? null},
          ${data.tadsNote ?? null},
          ${data.myofunctionalType ?? null},
          ${data.myofunctionalProgram ?? null},
          ${data.clearAlignersPlan ?? null},
          ${{
            caseStatus: data.caseStatus || "active",
            autoReminderEnabled,
            alignerDaysPerTray,
            ...(typeof data.galleryPhotos !== "undefined"
              ? { galleryPhotos: data.galleryPhotos }
              : {}),
            ...(typeof data.caseSheetAttachments !== "undefined"
              ? { caseSheetAttachments: data.caseSheetAttachments }
              : {}),
          }},
          ${new Date()},
          ${new Date()}
        )
        RETURNING *
      `;

      patient = inserted?.[0];

      if (appointmentDateTime && patient?.id) {
        await sql`
          INSERT INTO "Appointment" (
            "patientId",
            "scheduledAt",
            status,
            type,
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${patient.id},
            ${appointmentDateTime},
            ${"SCHEDULED"},
            ${"Initial Consultation"},
            ${new Date()},
            ${new Date()}
          )
        `;
      }
    }

    console.log('[DEBUG][POST /api/patients] created patient object:', patient);
    console.log('[DEBUG][POST /api/patients] usedSqlFallback:', usedSqlFallback);

    let firstAppointmentNotification: {
      attempted: boolean;
      sent: boolean;
      error?: string;
    } | null = null;

    try {
      const shouldAttemptFirstAppointmentMessage =
        autoReminderEnabled &&
        Boolean(patient?.firstAppointment) &&
        Boolean(appointmentDateTime) &&
        Boolean((patient?.phone || "").trim());

      const doctor = await getDoctorWhatsAppSettings(user.id);

      const doctorCredentials = await buildDoctorWhatsAppCredentials({
        whatsappAccessToken: doctor?.whatsappAccessToken,
        whatsappPhoneNumberId: doctor?.whatsappPhoneNumberId,
        whatsappBusinessAccountId: doctor?.whatsappBusinessAccountId,
        userId: user.id,
      });

      if (shouldAttemptFirstAppointmentMessage) {
        console.log("[WhatsApp] Automatic instruction triggered", {
          type: "firstAppointmentConfirmation",
          patientId: patient.id,
        });
        const existingMetadata = getMetadataObject(patient.metadata);
        const remindersSent = getMetadataObject(existingMetadata.remindersSent);

        if (remindersSent.firstAppointmentConfirmation !== true) {
          const confirmationMessage = buildFirstAppointmentConfirmationMessage({
            patientName: patient.name,
            appointmentDate: appointmentDateTime as Date,
            appointmentTime:
              data.appointmentTime ||
              formatAppointmentTime(appointmentDateTime as Date),
          });

          const sendResult = await sendWhatsAppText(
            doctorCredentials,
            patient.phone,
            confirmationMessage
          );
          firstAppointmentNotification = {
            attempted: true,
            sent: sendResult.ok,
            error: sendResult.error,
          };

          const nextMetadata: Record<string, unknown> = {
            ...existingMetadata,
            remindersSent: {
              ...remindersSent,
              firstAppointmentConfirmation: sendResult.ok,
              firstAppointmentConfirmationSentAt: sendResult.ok
                ? new Date().toISOString()
                : remindersSent.firstAppointmentConfirmationSentAt,
              firstAppointmentConfirmationLastError: sendResult.ok
                ? null
                : sendResult.error || "Unknown WhatsApp send error",
            },
          };

          try {
            await prisma.patient.update({
              where: { id: patient.id },
              data: { metadata: nextMetadata as any },
            });
          } catch {
            try {
              const sql = getSqlClient();
              await sql`
                UPDATE "Patient"
                SET metadata = ${nextMetadata}::jsonb,
                    "updatedAt" = ${new Date()}
                WHERE id = ${patient.id}
              `;
            } catch (metadataUpdateError) {
              console.error(
                "Failed to persist first appointment reminder metadata:",
                metadataUpdateError
              );
            }
          }

          patient.metadata = nextMetadata;
        }
      }
    } catch (notificationError) {
      console.error("[WARN][POST /api/patients] optional reminder notification failed:", notificationError);
      firstAppointmentNotification = {
        attempted: false,
        sent: false,
        error: notificationError instanceof Error ? notificationError.message : "Optional reminder failed",
      };
    }

    const responsePayload = { ...patient, id: patient.id, userId: patient.userId };
    console.log('[DEBUG][POST /api/patients] response id:', responsePayload.id);

    if (firstAppointmentNotification) {
      (responsePayload as any).firstAppointmentNotification =
        firstAppointmentNotification;
    }

    try {
      await recordAuditLog({
        userId: user.id,
        action: "DOCTOR_CREATED_PATIENT",
        targetType: "PATIENT",
        targetId: String(responsePayload.id),
      });
    } catch (auditError) {
      console.error("[WARN][POST /api/patients] audit log failed but patient save should still succeed:", auditError);
    }

    // Return the created patient explicitly including id and userId to avoid
    // any client-side ambiguity about the returned shape.
    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    console.error("PATIENT API ERROR");
    console.error(error);
    console.error(
      "[ERROR][POST /api/patients] runtime diagnostics:",
      getRuntimeDiagnostics()
    );
    if (error instanceof Error) {
      console.error(error.stack);
    }

    const message = error instanceof Error ? error.message : String(error);
    const isDbConfigIssue =
      /DATABASE_URL|NEON_DATABASE_URL|Authentication failed against database server|P1000|provided database credentials/i.test(message);

    return NextResponse.json(
      {
        message: isDbConfigIssue ? "Database configuration error" : "Internal Server Error",
        error: isDbConfigIssue
          ? "The app database is not configured correctly. Update the Neon DATABASE_URL in .env with the real connection string, then redeploy."
          : message,
      },
      { status: 500 }
    );
  }
}
