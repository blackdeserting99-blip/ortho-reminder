import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/app/lib/auth";

export class AdminAccessError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AdminAccount = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "DOCTOR";
  isDisabled: boolean;
  subscriptionStatus: "FREE" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
  subscriptionEndDate: Date | null;
  createdAt: Date;
};

export type AdminOverview = {
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
};

export type AdminDoctorListItem = {
  id: string;
  name: string | null;
  email: string;
  clinicName: string | null;
  createdAt: Date;
  patientCount: number;
  appointmentCount: number;
  isDisabled: boolean;
  subscriptionStatus: "FREE" | "ACTIVE" | "EXPIRED" | "SUSPENDED";
  role: "ADMIN" | "DOCTOR";
};

export type AdminDoctorDetails = {
  doctor: AdminDoctorListItem;
  totalVisits: number;
  upcomingAppointments: number;
  patients: Array<{
    id: number;
    name: string;
    treatmentCategory: string | null;
    createdAt: Date;
  }>;
};

function getDatabaseUrl() {
  const primary = process.env.DATABASE_URL;
  if (primary && primary !== "undefined" && primary.trim().length > 0) {
    return primary;
  }

  const fallback = process.env.NEON_DATABASE_URL;
  if (fallback && fallback !== "undefined" && fallback.trim().length > 0) {
    return fallback;
  }

  return null;
}

function getSqlClient() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

async function getUserAccount(userId: string): Promise<AdminAccount | null> {
  const sql = getSqlClient();
  const rows = await sql`
    SELECT
      id,
      name,
      email,
      role,
      "isDisabled",
      "subscriptionStatus",
      "subscriptionEndDate",
      "createdAt"
    FROM "User"
    WHERE id = ${userId}
    LIMIT 1
  `;

  const row = rows?.[0] as any;
  if (!row) return null;

  return {
    id: String(row.id),
    name: row.name ?? null,
    email: String(row.email),
    role: row.role,
    isDisabled: Boolean(row.isDisabled),
    subscriptionStatus: row.subscriptionStatus,
    subscriptionEndDate: row.subscriptionEndDate ? new Date(row.subscriptionEndDate) : null,
    createdAt: new Date(row.createdAt),
  };
}

export async function requireAdmin() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id) {
    throw new AdminAccessError(401, "Unauthorized");
  }

  const account = await getUserAccount(sessionUser.id);
  if (!account) {
    throw new AdminAccessError(401, "Unauthorized");
  }

  if (account.isDisabled) {
    throw new AdminAccessError(403, "Account disabled");
  }

  if (account.role !== "ADMIN") {
    throw new AdminAccessError(403, "Forbidden");
  }

  return account;
}

export function asAdminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Internal Server Error" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const sql = getSqlClient();

  const [doctorsRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "User"
    WHERE role = 'DOCTOR'
  `;

  const [patientsRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Patient"
  `;

  const [appointmentsRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Appointment"
  `;

  const [activeSubsRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "User"
    WHERE role = 'DOCTOR' AND "subscriptionStatus" = 'ACTIVE'
  `;

  const [monthlyRevenueRow] = await sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM "Payment"
    WHERE date >= date_trunc('month', NOW())
  `;

  return {
    totalDoctors: Number(doctorsRow?.count ?? 0),
    totalPatients: Number(patientsRow?.count ?? 0),
    totalAppointments: Number(appointmentsRow?.count ?? 0),
    activeSubscriptions: Number(activeSubsRow?.count ?? 0),
    monthlyRevenue: Number(monthlyRevenueRow?.total ?? 0),
  };
}

export async function getAdminDoctors(): Promise<AdminDoctorListItem[]> {
  const sql = getSqlClient();

  const rows = await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u."createdAt",
      u."isDisabled",
      u."subscriptionStatus",
      (
        SELECT c.name
        FROM "Clinic" c
        WHERE c."ownerId" = u.id
        ORDER BY c.id ASC
        LIMIT 1
      ) AS "clinicName",
      (
        SELECT COUNT(*)::int
        FROM "Patient" p
        WHERE p."userId" = u.id
      ) AS "patientCount",
      (
        SELECT COUNT(*)::int
        FROM "Appointment" a
        INNER JOIN "Patient" p ON p.id = a."patientId"
        WHERE p."userId" = u.id
      ) AS "appointmentCount"
    FROM "User" u
    WHERE u.role = 'DOCTOR'
    ORDER BY u."createdAt" DESC
  `;

  return (rows as any[]).map((row) => ({
    id: String(row.id),
    name: row.name ?? null,
    email: String(row.email),
    role: row.role,
    clinicName: row.clinicName ?? null,
    createdAt: new Date(row.createdAt),
    patientCount: Number(row.patientCount ?? 0),
    appointmentCount: Number(row.appointmentCount ?? 0),
    isDisabled: Boolean(row.isDisabled),
    subscriptionStatus: row.subscriptionStatus,
  }));
}

export async function getAdminDoctorById(doctorId: string): Promise<AdminDoctorDetails | null> {
  const sql = getSqlClient();

  const doctorRows = await sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u."createdAt",
      u."isDisabled",
      u."subscriptionStatus",
      (
        SELECT c.name
        FROM "Clinic" c
        WHERE c."ownerId" = u.id
        ORDER BY c.id ASC
        LIMIT 1
      ) AS "clinicName",
      (
        SELECT COUNT(*)::int
        FROM "Patient" p
        WHERE p."userId" = u.id
      ) AS "patientCount",
      (
        SELECT COUNT(*)::int
        FROM "Appointment" a
        INNER JOIN "Patient" p ON p.id = a."patientId"
        WHERE p."userId" = u.id
      ) AS "appointmentCount"
    FROM "User" u
    WHERE u.id = ${doctorId} AND u.role = 'DOCTOR'
    LIMIT 1
  `;

  const doctorRow = (doctorRows as any[])?.[0];
  if (!doctorRow) return null;

  const [visitsRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Visit" v
    INNER JOIN "Patient" p ON p.id = v."patientId"
    WHERE p."userId" = ${doctorId}
  `;

  const [upcomingRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Appointment" a
    INNER JOIN "Patient" p ON p.id = a."patientId"
    WHERE p."userId" = ${doctorId}
      AND a."scheduledAt" >= NOW()
      AND a.status IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
  `;

  const patientRows = await sql`
    SELECT id, name, "treatmentCategory", "createdAt"
    FROM "Patient"
    WHERE "userId" = ${doctorId}
    ORDER BY "createdAt" DESC
    LIMIT 200
  `;

  return {
    doctor: {
      id: String(doctorRow.id),
      name: doctorRow.name ?? null,
      email: String(doctorRow.email),
      role: doctorRow.role,
      clinicName: doctorRow.clinicName ?? null,
      createdAt: new Date(doctorRow.createdAt),
      patientCount: Number(doctorRow.patientCount ?? 0),
      appointmentCount: Number(doctorRow.appointmentCount ?? 0),
      isDisabled: Boolean(doctorRow.isDisabled),
      subscriptionStatus: doctorRow.subscriptionStatus,
    },
    totalVisits: Number(visitsRow?.count ?? 0),
    upcomingAppointments: Number(upcomingRow?.count ?? 0),
    patients: (patientRows as any[]).map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      treatmentCategory: row.treatmentCategory ?? null,
      createdAt: new Date(row.createdAt),
    })),
  };
}

export async function setDoctorDisabled(doctorId: string, disabled: boolean) {
  const sql = getSqlClient();
  const rows = await sql`
    UPDATE "User"
    SET "isDisabled" = ${disabled}, "updatedAt" = NOW()
    WHERE id = ${doctorId} AND role = 'DOCTOR'
    RETURNING id, email, "isDisabled"
  `;

  return (rows as any[])?.[0] ?? null;
}

export async function updateDoctorSubscription(
  doctorId: string,
  status: "FREE" | "ACTIVE" | "EXPIRED" | "SUSPENDED",
  subscriptionEndDate: string | null
) {
  const sql = getSqlClient();
  const endDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;

  const rows = await sql`
    UPDATE "User"
    SET
      "subscriptionStatus" = ${status}::"SubscriptionStatus",
      "subscriptionEndDate" = ${endDate},
      "updatedAt" = NOW()
    WHERE id = ${doctorId} AND role = 'DOCTOR'
    RETURNING id, email, "subscriptionStatus", "subscriptionEndDate"
  `;

  return (rows as any[])?.[0] ?? null;
}

export async function deleteDoctorAccount(doctorId: string) {
  const sql = getSqlClient();

  const [patientCountRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Patient"
    WHERE "userId" = ${doctorId}
  `;

  const patientCount = Number(patientCountRow?.count ?? 0);
  if (patientCount > 0) {
    return { ok: false as const, reason: "Doctor has patients. Disable account instead." };
  }

  const [clinicCountRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM "Clinic"
    WHERE "ownerId" = ${doctorId}
  `;

  const clinicCount = Number(clinicCountRow?.count ?? 0);
  if (clinicCount > 0) {
    return { ok: false as const, reason: "Doctor owns clinic data. Disable account instead." };
  }

  const deleted = await sql`
    DELETE FROM "User"
    WHERE id = ${doctorId} AND role = 'DOCTOR'
    RETURNING id, email
  `;

  const row = (deleted as any[])?.[0];
  if (!row) {
    return { ok: false as const, reason: "Doctor not found." };
  }

  return { ok: true as const, doctor: row };
}
