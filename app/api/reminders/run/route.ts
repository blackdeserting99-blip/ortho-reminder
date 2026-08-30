import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  buildDoctorWhatsAppCredentials,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";

export const runtime = "nodejs";

const TIME_ZONE = "Asia/Baghdad";

function getSqlClient() {
  const connectionString =
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(connectionString);
}

function getBaghdadDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function formatAppointmentDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatAppointmentTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getReminderMetadata(metadata: unknown) {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

export async function POST(request: Request) {
  try {
    // =========================
    // AUTHENTICATION
    // =========================

    const expectedToken = process.env.REMINDER_API_TOKEN;

    const workerToken = request.headers.get(
      "x-worker-reminder-auth"
    );

    const directToken = request.headers.get(
      "x-reminder-token"
    );

    const providedToken =
      workerToken || directToken;

    if (!expectedToken) {
      return NextResponse.json(
        {
          error: "SERVER_REMINDER_TOKEN_MISSING",
        },
        { status: 500 }
      );
    }

    if (
      !providedToken ||
      providedToken !== expectedToken
    ) {
      return NextResponse.json(
        {
          error: "ROUTE_AUTH_REJECTED",
        },
        { status: 401 }
      );
    }

    // =========================
    // REQUEST BODY
    // =========================

    const body = await request.json().catch(() => ({}));

    const dryRun =
      body.dryRun === true;

    const reminderType =
      body.reminderType === "sameDay"
        ? "sameDay"
        : "3days";

    const limit =
      Math.min(
        Math.max(Number(body.limit) || 100, 1),
        500
      );

    // Base date can be supplied for testing.
    // Otherwise use today's Baghdad date.

    const baseDate =
      typeof body.baseDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.baseDate)
        ? body.baseDate
        : getBaghdadDateString(new Date());

    let targetDate: string;

    if (reminderType === "3days") {
      targetDate = addDays(baseDate, 3);
    } else {
      targetDate = baseDate;
    }

    console.log("[REMINDER ENGINE]", {
      reminderType,
      baseDate,
      targetDate,
      dryRun,
    });

    // =========================
    // DATABASE
    // =========================

    const sql = getSqlClient();

    const appointments = await sql`
      SELECT
        a.id,
        a."scheduledAt",
        a.status,
        a.metadata,

        p.id AS "patientId",
        p.name AS "patientName",
        p.phone AS "patientPhone",
        p."userId" AS "userId",

        u."whatsappAccessToken",
        u."whatsappPhoneNumberId"

      FROM "Appointment" a

      INNER JOIN "Patient" p
        ON p.id = a."patientId"

      INNER JOIN "User" u
        ON u.id = p."userId"

      WHERE
        a."deletedAt" IS NULL

        AND p."deletedAt" IS NULL

        AND a.status NOT IN (
          'COMPLETED',
          'CANCELED',
          'NO_SHOW'
        )

        AND (
          a."scheduledAt"
          AT TIME ZONE ${TIME_ZONE}
        )::date = ${targetDate}::date

      ORDER BY a."scheduledAt" ASC

      LIMIT ${limit}
    `;

    console.log(
      `[REMINDER ENGINE] Found ${appointments.length} appointment(s)`
    );

    const results = [];

    // =========================
    // PROCESS APPOINTMENTS
    // =========================

    for (const appointment of appointments) {
      try {
        const metadata =
          getReminderMetadata(
            appointment.metadata
          );

        const remindersSent =
          metadata.remindersSent &&
          typeof metadata.remindersSent === "object"
            ? metadata.remindersSent as Record<
                string,
                unknown
              >
            : {};

        // Prevent duplicates separately:
        // 3days and sameDay

        if (remindersSent[reminderType]) {
          results.push({
            appointmentId: appointment.id,
            patient: appointment.patientName,
            status: "SKIPPED_ALREADY_SENT",
          });

          continue;
        }

        const phone = String(
          appointment.patientPhone || ""
        ).trim();

        if (!phone) {
          results.push({
            appointmentId: appointment.id,
            patient: appointment.patientName,
            status: "SKIPPED_NO_PHONE",
          });

          continue;
        }

        // =========================
        // APPOINTMENT INFO
        // =========================

        const scheduledAt =
          new Date(appointment.scheduledAt);

        const appointmentDate =
          formatAppointmentDate(
            scheduledAt
          );

        const appointmentTime =
          formatAppointmentTime(
            scheduledAt
          );

        // =========================
        // IRAQI ARABIC MESSAGE
        // =========================

        const message =
          reminderType === "3days"
            ? `${appointment.patientName}، نود إعلامك بأن موعدك القادم سيكون بتاريخ ${appointmentDate} الساعة ${appointmentTime}. يرجى الالتزام بالموعد، وفي حال تعذر الحضور يرجى التواصل معنا مسبقاً.`
            : `${appointment.patientName}، تذكير بأن موعدك اليوم بتاريخ ${appointmentDate} الساعة ${appointmentTime}. نرجو الالتزام بوقت الموعد والحضور في الموعد المحدد.`;

        // =========================
        // DRY RUN
        // =========================

        if (dryRun) {
          results.push({
            appointmentId: appointment.id,
            patient: appointment.patientName,
            phone,
            appointmentDate,
            appointmentTime,
            reminderType,
            status: "DRY_RUN_WOULD_SEND",
            message,
          });

          continue;
        }

        // =========================
        // GET DOCTOR WHATSAPP
        // =========================

        const credentials =
          await buildDoctorWhatsAppCredentials({
            whatsappAccessToken:
              appointment.whatsappAccessToken ?? null,

            whatsappPhoneNumberId:
              appointment.whatsappPhoneNumberId ?? null,

            userId:
              appointment.userId,
          });

        // =========================
        // SEND WHATSAPP
        // =========================

        const sendResult =
          await sendWhatsAppText(
            credentials,
            phone,
            message
          );

        if (!sendResult.ok) {
          results.push({
            appointmentId: appointment.id,
            patient: appointment.patientName,
            status: "FAILED",
            error:
              sendResult.error ||
              "WhatsApp provider rejected message",
          });

          continue;
        }

        // =========================
        // SAVE DUPLICATE PROTECTION
        // =========================

        const updatedMetadata = {
          ...metadata,

          remindersSent: {
            ...remindersSent,

            [reminderType]: {
              sentAt:
                new Date().toISOString(),

              messageId:
                sendResult.messageId || null,

              provider:
                sendResult.provider || null,
            },
          },
        };

        await sql`
          UPDATE "Appointment"

          SET
            metadata =
              ${JSON.stringify(updatedMetadata)}::jsonb,

            "reminderStatus" =
              'SENT'::"WhatsAppStatus",

            "reminderSentAt" =
              NOW(),

            "updatedAt" =
              NOW()

          WHERE id =
            ${appointment.id}
        `;

        results.push({
          appointmentId: appointment.id,
          patient: appointment.patientName,
          phone: sendResult.to,
          reminderType,
          status: "SENT",
          provider:
            sendResult.provider,

          messageId:
            sendResult.messageId || null,
        });

      } catch (error) {
        console.error(
          `[REMINDER ERROR] Appointment ${appointment.id}`,
          error
        );

        results.push({
          appointmentId: appointment.id,
          status: "ERROR",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }

    // =========================
    // RESPONSE
    // =========================

    return NextResponse.json({
      success: true,

      dryRun,

      reminderType,

      baseDate,

      targetDate,

      found:
        appointments.length,

      results,
    });

  } catch (error) {
    console.error(
      "[REMINDER ROUTE ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          "REMINDER_ROUTE_ERROR",

        message:
          error instanceof Error
            ? error.message
            : String(error),
      },

      {
        status: 500,
      }
    );
  }
}