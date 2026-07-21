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
  return obj.autoReminderEnabled !== false;
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

function getAlignerPrepLeadDays() {
  const parsed = Number(process.env.ALIGNER_PREP_LEAD_DAYS || "14");
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 90) {
    return 14;
  }

  return Math.floor(parsed);
}

function getUtcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getDiffDays(from: Date, to: Date) {
  const fromDate = getUtcDateOnly(from);
  const toDate = getUtcDateOnly(to);
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
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

function wasPatchPrepSent(previous: unknown): boolean {
  const base = toMetadataObject(previous);
  const remindersSent = toMetadataObject(base.remindersSent);
  return Boolean(remindersSent.patchPrep14days);
}

function markPatchPrepSent(previous: unknown): MetadataObject {
  const base = toMetadataObject(previous);
  const remindersSent = {
    ...toMetadataObject(base.remindersSent),
    patchPrep14days: true,
  };

  return {
    ...base,
    remindersSent,
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

function readClearAlignersPlan(value: unknown): {
  total: number;
  given: number;
  wearDays: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const total = Number(raw.total);
  const given = Number(raw.given);
  const wearDays = Number(raw.wearDays || 14);

  if (!Number.isFinite(total) || !Number.isFinite(given) || total <= 0 || given <= 0) {
    return null;
  }

  return {
    total: Math.floor(total),
    given: Math.floor(given),
    wearDays: Number.isFinite(wearDays) && wearDays > 0 ? Math.floor(wearDays) : 14,
  };
}

function hasUpcomingAlignerPatch(patient: { treatmentCategory: string | null; clearAlignersPlan: unknown }) {
  const treatment = (patient.treatmentCategory || "").toLowerCase();
  const plan = readClearAlignersPlan(patient.clearAlignersPlan);

  if (!treatment.includes("clear aligners") || !plan) {
    return null;
  }

  if (plan.total <= plan.given) {
    return null;
  }

  return {
    ...plan,
    nextPatchStartsFrom: plan.given + 1,
    remainingAligners: plan.total - plan.given,
  };
}

function buildAlignerPatchDoctorMessage(input: {
  patientName: string;
  patientPhone: string;
  appointmentDate: Date;
  total: number;
  given: number;
  remainingAligners: number;
  nextPatchStartsFrom: number;
}) {
  return [
    "Aligner patch preparation alert.",
    `Patient: ${input.patientName}`,
    `Phone: ${input.patientPhone}`,
    "Lead time alert: 14 days before patient appointment.",
    `Today marks aligner #${input.given}.`,
    `Total planned aligners: ${input.total}`,
    `Remaining aligners after current patch: ${input.remainingAligners}`,
    `Please prepare next patch starting from aligner #${input.nextPatchStartsFrom}.`,
    `Review date: ${formatIsoDate(input.appointmentDate)} ${formatLocalTime(input.appointmentDate)} UTC`,
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
            select: { phone: true, name: true },
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
    doctorPatchPrepSent: 0,
    doctorPatchPrepSkippedAlreadySent: 0,
    doctorPatchPrepFailed: 0,
  };

  const results: Array<Record<string, unknown>> = [];

  for (const appointment of appointments) {
    const leadDays = getAlignerPrepLeadDays();
    const diffDays = getDiffDays(baseDate, appointment.scheduledAt);

    const upcomingPatch = hasUpcomingAlignerPatch(appointment.patient);
    const shouldRunPatchPrepAlert =
      Boolean(upcomingPatch) &&
      diffDays === leadDays &&
      readPatientAutoReminderEnabled(appointment.patient.metadata);

    if (shouldRunPatchPrepAlert && upcomingPatch) {
      if (wasPatchPrepSent(appointment.metadata)) {
        summary.doctorPatchPrepSkippedAlreadySent += 1;
      } else {
        const doctorPhone = getDoctorPhone(appointment.patient.clinic?.phone);
        const doctorPatchMessage = buildAlignerPatchDoctorMessage({
          patientName: appointment.patient.name,
          patientPhone: appointment.patient.phone || "-",
          appointmentDate: appointment.scheduledAt,
          total: upcomingPatch.total,
          given: upcomingPatch.given,
          remainingAligners: upcomingPatch.remainingAligners,
          nextPatchStartsFrom: upcomingPatch.nextPatchStartsFrom,
        });

        if (!dryRun && doctorPhone) {
          const patchSend = await sendWhatsAppText(doctorPhone, doctorPatchMessage);
          if (patchSend.ok) {
            summary.doctorPatchPrepSent += 1;
            await prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                metadata: markPatchPrepSent(appointment.metadata),
              },
            });
          } else {
            summary.doctorPatchPrepFailed += 1;
          }
        } else if (dryRun) {
          summary.doctorPatchPrepSent += 1;
        }

        results.push({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorPatchPrep: true,
          dryRun,
          leadDays,
          doctorPhone: doctorPhone || null,
          messagePreview: doctorPatchMessage,
        });
      }
    }

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
        name: appointment.patient.name,
        clinicName: appointment.patient.clinic?.name || "العيادة",
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
    let doctorMessage = buildDoctorMessage({
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
