import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import {
  buildWhatsAppBotMessage,
  getReminderType,
  sendWhatsAppText,
  type WhatsAppReminderType,
} from "@/app/lib/whatsapp";

const runSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  patientId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(500).optional().default(100),
  reminderType: z.enum(["3days", "sameDay", "general"]).optional(),
  baseDate: z.string().optional(),
});

type ReminderMap = Record<string, boolean>;

type MetadataObject = Record<string, unknown>;

const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "RESCHEDULED"] as const;

function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatLocalTime(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function toMetadataObject(value: unknown): MetadataObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MetadataObject;
}

function readSentMap(metadata: unknown): ReminderMap {
  const obj = toMetadataObject(metadata);
  const sent = obj.remindersSent;

  if (!sent || typeof sent !== "object" || Array.isArray(sent)) {
    return {};
  }

  return sent as ReminderMap;
}

function readPatientAutoReminderEnabled(metadata: unknown): boolean {
  const obj = toMetadataObject(metadata);
  return Boolean(obj.autoReminderEnabled);
}

function readAlignerDaysPerTray(metadata: unknown): number {
  const obj = toMetadataObject(metadata);
  const value = Number(obj.alignerDaysPerTray || 14);
  if (!Number.isFinite(value) || value <= 0 || value > 30) {
    return 14;
  }

  return Math.floor(value);
}

function getMorningHour() {
  const parsed = Number(process.env.REMINDER_MORNING_HOUR || "7");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 23) {
    return 7;
  }

  return Math.floor(parsed);
}

function allowSameDayNow(baseDate: Date) {
  return baseDate.getUTCHours() === getMorningHour();
}

function canSendReminder(
  sentMap: ReminderMap,
  reminderType: WhatsAppReminderType
): boolean {
  if (reminderType === "general") {
    return true;
  }

  return !Boolean(sentMap[reminderType]);
}

function updateMetadataSent(
  previous: unknown,
  reminderType: WhatsAppReminderType
): MetadataObject {
  const base = toMetadataObject(previous);
  const sentMap = readSentMap(previous);

  if (reminderType !== "general") {
    sentMap[reminderType] = true;
  }

  return {
    ...base,
    remindersSent: sentMap,
  };
}

function getDoctorPhone(clinicPhone: string | null | undefined) {
  return process.env.DOCTOR_WHATSAPP_PHONE || clinicPhone || "";
}

function buildDoctorMessage(input: {
  patientName: string;
  patientPhone: string;
  reminderType: WhatsAppReminderType;
  scheduledAt: Date;
}) {
  const label =
    input.reminderType === "3days"
      ? "3 days before"
      : input.reminderType === "sameDay"
      ? "same day"
      : "general";

  return [
    "Orthodontic reminder sent.",
    `Patient: ${input.patientName}`,
    `Phone: ${input.patientPhone}`,
    `Appointment: ${formatIsoDate(input.scheduledAt)} ${formatLocalTime(input.scheduledAt)} UTC`,
    `Reminder type: ${label}`,
  ].join("\n");
}

async function isAuthorized(request: Request) {
  const token = process.env.REMINDER_API_TOKEN;
  const requestToken = request.headers.get("x-reminder-token");

  if (token && requestToken && token === requestToken) {
    return { viaToken: true as const, userId: null as string | null };
  }

  const user = await getCurrentUser();
  if (user) {
    return { viaToken: false as const, userId: user.id };
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await isAuthorized(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = runSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { dryRun, patientId, limit, reminderType } = parsed.data;
  const baseDate = parsed.data.baseDate
    ? new Date(parsed.data.baseDate)
    : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return NextResponse.json({ error: "Invalid baseDate" }, { status: 400 });
  }

  const start = toDateOnly(baseDate);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: APPOINTMENT_STATUSES as unknown as any[] },
      scheduledAt: {
        gte: start,
        lte: end,
      },
      ...(patientId ? { patientId } : {}),
      ...(auth.userId ? { patient: { userId: auth.userId } } : {}),
    },
    include: {
      patient: {
        include: {
          visits: {
            orderBy: { id: "desc" },
            take: 5,
          },
          clinic: {
            select: { phone: true },
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });

  const summary = {
    scanned: appointments.length,
    eligible: 0,
    sent: 0,
    failed: 0,
    skippedAlreadySent: 0,
    skippedNoReminderType: 0,
    skippedNoPatientPhone: 0,
    skippedAutoReminderDisabled: 0,
    skippedOutsideMorningWindow: 0,
  };

  const results: Array<Record<string, unknown>> = [];

  for (const appointment of appointments) {
    const type = reminderType || getReminderType(appointment.scheduledAt.toISOString(), baseDate);

    if (!type) {
      summary.skippedNoReminderType += 1;
      continue;
    }

    if (!readPatientAutoReminderEnabled(appointment.patient.metadata)) {
      summary.skippedAutoReminderDisabled += 1;
      continue;
    }

    if (!reminderType && type === "sameDay" && !allowSameDayNow(baseDate)) {
      summary.skippedOutsideMorningWindow += 1;
      continue;
    }

    const sentMap = readSentMap(appointment.metadata);
    if (!canSendReminder(sentMap, type)) {
      summary.skippedAlreadySent += 1;
      continue;
    }

    const patientPhone = appointment.patient.phone || "";
    if (!patientPhone) {
      summary.skippedNoPatientPhone += 1;
      continue;
    }

    summary.eligible += 1;

    const patientMessage = buildWhatsAppBotMessage(
      {
        phone: patientPhone,
        appointmentDate: appointment.scheduledAt.toISOString(),
        appointmentTime: formatLocalTime(appointment.scheduledAt),
        treatmentCategory: appointment.patient.treatmentCategory || undefined,
        alignerDaysPerTray: readAlignerDaysPerTray(appointment.patient.metadata),
        firstAppointment: appointment.patient.firstAppointment,
        elasticEnabled: appointment.patient.elasticEnabled,
        elasticType: appointment.patient.elasticType || undefined,
        tadsNote: appointment.patient.tadsNote || undefined,
        myofunctionalType: appointment.patient.myofunctionalType || undefined,
        myofunctionalProgram: (appointment.patient.myofunctionalProgram as any) || undefined,
        visits: appointment.patient.visits.map((visit) => ({
          elasticEnabled: Boolean(visit.elastics),
          elasticType: visit.elastics || undefined,
          tadsNote: visit.tads || undefined,
        })),
      },
      type
    );

    const doctorPhone = getDoctorPhone(appointment.patient.clinic?.phone);
    const doctorMessage = buildDoctorMessage({
      patientName: appointment.patient.name,
      patientPhone,
      reminderType: type,
      scheduledAt: appointment.scheduledAt,
    });

    if (dryRun) {
      results.push({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        reminderType: type,
        dryRun: true,
        patientPhone,
        doctorPhone: doctorPhone || null,
      });
      continue;
    }

    const patientSend = await sendWhatsAppText(patientPhone, patientMessage);
    const doctorSend = doctorPhone
      ? await sendWhatsAppText(doctorPhone, doctorMessage)
      : { ok: true, provider: "simulation" as const, to: "" };

    const success = patientSend.ok && doctorSend.ok;

    if (success) {
      summary.sent += 1;
    } else {
      summary.failed += 1;
    }

    const reminderErrors = [patientSend.error, doctorSend.error].filter(Boolean).join(" | ");

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        reminderStatus: success ? "SENT" : "FAILED",
        reminderSentAt: success ? new Date() : appointment.reminderSentAt,
        reminderNote: reminderErrors || null,
        metadata: updateMetadataSent(appointment.metadata, type),
      },
    });

    results.push({
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      reminderType: type,
      patientSend,
      doctorSend,
      success,
    });
  }

  return NextResponse.json({
    status: "ok",
    dryRun,
    summary,
    results,
  });
}
