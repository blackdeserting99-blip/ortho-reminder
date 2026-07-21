import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function formatDateIso(date: Date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function getClearAlignersPlan(value: unknown): { total: number; given: number; wearDays: number } | null {
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

function getLeadDays() {
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

function isAutoReminderEnabled(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return true;
  }

  const raw = metadata as Record<string, unknown>;
  return raw.autoReminderEnabled !== false;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    where: {
      userId: user.id,
      treatmentCategory: { contains: "Clear Aligners", mode: "insensitive" },
    },
    include: {
      appointments: {
        where: {
          status: { in: ["SCHEDULED", "CONFIRMED", "RESCHEDULED"] },
        },
        orderBy: { scheduledAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = new Date().toLocaleDateString("en-CA");
  const todayDate = new Date(`${today}T00:00:00Z`);
  const leadDays = getLeadDays();

  const notifications = patients
    .map((patient) => {
      if (!isAutoReminderEnabled(patient.metadata)) {
        return null;
      }

      const plan = getClearAlignersPlan(patient.clearAlignersPlan);
      if (!plan) {
        return null;
      }

      if (plan.total <= plan.given) {
        return null;
      }

      const nextAppointment = patient.appointments?.[0]?.scheduledAt;
      if (!nextAppointment) {
        return null;
      }

      const appointmentDate = formatDateIso(nextAppointment);
      const diffDays = getDiffDays(todayDate, nextAppointment);
      if (diffDays !== leadDays) {
        return null;
      }

      return {
        id: `${patient.id}-${appointmentDate}-${plan.given}`,
        patientId: patient.id,
        patientName: patient.name,
        patientPhone: patient.phone,
        appointmentDate,
        alignerReached: plan.given,
        totalAligners: plan.total,
        nextPatchStartsFrom: plan.given + 1,
        remainingAligners: plan.total - plan.given,
        leadDays,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return NextResponse.json({ notifications });
}
