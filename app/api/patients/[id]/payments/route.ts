import { NextResponse } from "next/server";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";
import { getCurrentUser } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "UPI", "INSURANCE", "OTHER"]),
  paymentDate: z.string().optional(),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString || connectionString === "undefined") {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

function serializePayment(row: Record<string, unknown>) {
  return {
    id: row.id,
    patientId: row.patientId,
    visitId: row.visitId ?? null,
    method: row.method,
    amount: Number(row.amount),
    currency: row.currency,
    date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
    note: row.note ?? null,
    reference: row.reference ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const patients = await sql`SELECT id FROM "Patient" WHERE id = ${patientId} AND "userId" = ${user.id} LIMIT 1`;
    if (!patients.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const payments = await sql`
      SELECT id, "patientId", "visitId", method, amount, currency, date, note, reference, "createdAt", "updatedAt"
      FROM "Payment"
      WHERE "patientId" = ${patientId}
      ORDER BY date ASC, "createdAt" ASC
    `;

    return NextResponse.json(payments.map(serializePayment));
  } catch (error) {
    console.error("GET /api/patients/[id]/payments failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const patients = await sql`SELECT id FROM "Patient" WHERE id = ${patientId} AND "userId" = ${user.id} LIMIT 1`;
    if (!patients.length) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const paymentDate = parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date" }, { status: 400 });
    }

    const note = parsed.data.reason?.trim() || null;
    const reference = parsed.data.reference?.trim() || null;

    const rows = await sql`
      INSERT INTO "Payment" ("patientId", "visitId", method, amount, currency, date, note, reference, "createdById", "createdAt", "updatedAt")
      VALUES (
        ${patientId}, NULL, ${parsed.data.method}, ${parsed.data.amount}, 'IQD',
        ${paymentDate.toISOString()}, ${note}, ${reference}, ${user.id},
        NOW(), NOW()
      )
      RETURNING id, "patientId", "visitId", method, amount, currency, date, note, reference, "createdAt", "updatedAt"
    `;

    return NextResponse.json(serializePayment(rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error("POST /api/patients/[id]/payments failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
