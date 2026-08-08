import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/app/lib/auth";
import { recordAuditLog } from "@/app/lib/audit";

const resetSchema = z.object({
  doctorId: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

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

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwardedFor.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    firstForwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const sql = getSqlClient();
  const rows = await sql`
    SELECT id, role, "isDisabled"
    FROM "User"
    WHERE id = ${user.id}
    LIMIT 1
  `;
  const account = rows?.[0] ?? null;
  if (!account || account.isDisabled || account.role !== "ADMIN") {
    return null;
  }

  return {
    id: String(account.id),
    role: String(account.role),
  };
}

function normalizeQuery(query: string) {
  const trimmed = query.trim();
  if (trimmed.includes("@")) {
    return { mode: "email" as const, value: trimmed.toLowerCase() };
  }

  const digits = trimmed.replace(/\D/g, "");
  return { mode: "phone" as const, value: digits };
}

async function loginTest(request: Request, email: string, password: string) {
  const loginResponse = await fetch(new URL("/api/login", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const loginData = await loginResponse.json().catch(() => null);
  return {
    ok: loginResponse.ok,
    status: loginResponse.status,
    data: loginData,
  };
}

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const queryValue = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim();
  if (!queryValue) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const search = normalizeQuery(queryValue);
  const sql = getSqlClient();

  const rows =
    search.mode === "email"
      ? await sql`
          SELECT id, name, email, "whatsappPhone", role
          FROM "User"
          WHERE LOWER(email) = ${search.value}
          LIMIT 1
        `
      : await sql`
          SELECT id, name, email, "whatsappPhone", role
          FROM "User"
          WHERE regexp_replace(COALESCE("whatsappPhone", ''), '\\D', '', 'g') = ${search.value}
          LIMIT 1
        `;

  const doctor = rows?.[0] ?? null;
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  return NextResponse.json({
    doctor: {
      id: String(doctor.id),
      name: doctor.name ? String(doctor.name) : null,
      email: String(doctor.email),
      phone: doctor.whatsappPhone ? String(doctor.whatsappPhone) : null,
      role: String(doctor.role),
    },
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "doctorId, newPassword, and confirmPassword are required" },
      { status: 400 }
    );
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const sql = getSqlClient();
  const doctorRows = await sql`
    SELECT id, name, email, "whatsappPhone", role, "passwordHash"
    FROM "User"
    WHERE id = ${parsed.data.doctorId} AND role = 'DOCTOR'
    LIMIT 1
  `;

  const doctor = doctorRows?.[0] ?? null;
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await sql`
    UPDATE "User"
    SET "passwordHash" = ${passwordHash},
        "updatedAt" = ${new Date()}
    WHERE id = ${doctor.id}
  `;

  const compareOk = await bcrypt.compare(parsed.data.newPassword, passwordHash);
  if (!compareOk) {
    return NextResponse.json(
      { error: "Password hash verification failed" },
      { status: 500 }
    );
  }

  const loginTestResult = await loginTest(request, String(doctor.email), parsed.data.newPassword);
  if (!loginTestResult.ok) {
    return NextResponse.json(
      {
        error: "Login test failed",
        details: loginTestResult.data?.error || loginTestResult.data?.message || "Unable to authenticate with the new password.",
      },
      { status: 502 }
    );
  }

  await recordAuditLog({
    userId: admin.id,
    action: "ADMIN_RESET_DOCTOR_PASSWORD",
    targetType: "USER",
    targetId: String(doctor.id),
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({
    ok: true,
    message: "✅ Password reset successfully.",
    doctor: {
      id: String(doctor.id),
      name: doctor.name ? String(doctor.name) : null,
      email: String(doctor.email),
      phone: doctor.whatsappPhone ? String(doctor.whatsappPhone) : null,
      role: String(doctor.role),
    },
    loginTest: loginTestResult.data,
  });
}