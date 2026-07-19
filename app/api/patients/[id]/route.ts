import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const patientSchema = z.object({
  name: z.string().min(1, "Patient name is required").optional(),
  phone: z.string().min(1, "Contact number is required").optional(),
  clinicName: z.string().optional(),
  clinicColor: z.string().optional(),
  address: z.string().optional(),
  age: z.number().int().nonnegative().optional(),
  occupation: z.string().optional(),
  treatment: z.string().min(1, "Treatment is required").optional(),
  treatmentCategory: z.string().optional(),
  bracketType: z.string().optional(),
  caseSheet: z.string().optional(),
  attachments: z.any().optional(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  firstAppointment: z.boolean().optional(),
  notes: z.string().optional(),
  plannedNotes: z.string().optional(),
  totalFee: z.number().nonnegative().optional(),
  totalPaid: z.number().nonnegative().optional(),
  retainerFee: z.number().nonnegative().optional(),
  elasticEnabled: z.boolean().optional(),
  elasticType: z.string().optional(),
  tadsNote: z.string().optional(),
  caseStatus: z.string().optional(),
  visits: z.any().optional(),
  myofunctionalType: z.string().optional(),
  myofunctionalProgram: z.any().optional(),
  clearAlignersPlan: z.any().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

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

  // Query for patient owned by this user
  try {
const patient = await prisma.patient.findFirst({
  where: {
    id: patientId,
    userId: user.id,
  },
});
    if (patient) {
      console.log('[DEBUG][GET /api/patients/[id]] found patient for user:', user.id, 'patientId:', patient.id);
      return NextResponse.json(patient);
    }

    // Not found under the current user. Check fallback by id to log details.
    const fallback = await prisma.patient.findUnique({ where: { id: patientId } });
    if (fallback) {
      console.log('[DEBUG][GET /api/patients/[id]] ownership mismatch: patient found but userId differs. patientId:', fallback.id, 'patient.userId:', (fallback as any).userId);
      return NextResponse.json(fallback);
    }

    console.log('[DEBUG][GET /api/patients/[id]] patient not found in DB for id:', patientId);
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  } catch (error) {
    console.error('========== PRISMA ERROR ==========', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parseResult = patientSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
  }

  // Handle relational 'visits' field specially. Prisma does not accept a
  // client-sent visits array directly in patient.update(). The client often
  // sends the full visits array (existing + new). Detect appended visits and
  // create Visit records accordingly, while updating scalar patient fields.

  const incoming = parseResult.data as any;
  const visitsArray = Array.isArray(incoming.visits) ? incoming.visits : null;

  // Remove visits from update payload so we can safely update patient scalars
  const updatePayload: any = { ...incoming };
  if (updatePayload.visits) delete updatePayload.visits;

  // Update patient scalar fields
  const updatedPatient = await prisma.patient.update({ where: { id: patientId }, data: updatePayload });

  // If visits were provided, create any new visits (append-only)
  if (visitsArray && visitsArray.length > 0) {
    // Count existing visits
    const existingCount = await prisma.visit.count({ where: { patientId } });
    const newVisits = visitsArray.slice(existingCount);

    for (const v of newVisits) {
      // Map fields - only include known Visit fields
      await prisma.visit.create({
        data: {
          patientId,
          date: v.date || '',
          time: v.time || null,
          wireUsed: v.wireUsed || null,
          upperArch: v.upperArch || null,
          lowerArch: v.lowerArch || null,
          elastics: v.elastics || null,
          tads: v.tads || null,
          treatmentNotes: v.treatmentNotes || null,
          paymentCollected: v.payment || null,
        },
      });
    }
  }

  // Return the updated patient including visits
const reloaded = await prisma.patient.findUnique({
  where: {
    id: patientId,
  },
});
  return NextResponse.json(reloaded);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);

  if (!Number.isFinite(patientId)) {
    return NextResponse.json({ error: "Invalid patient id" }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { id: patientId, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  await prisma.patient.delete({ where: { id: patientId } });

  return NextResponse.json({ success: true });
}
