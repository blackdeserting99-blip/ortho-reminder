import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const patientSchema = z.object({
  // Only require the patient name. Everything else is optional.
  name: z.string().min(1, "Patient name is required"),
  phone: z.string().optional(),
  clinicName: z.string().optional(),
  clinicColor: z.string().optional(),
  address: z.string().optional(),
  age: z.number().int().nonnegative().optional(),
  occupation: z.string().optional(),
  treatment: z.string().optional(),
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

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patients = await prisma.patient.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(patients);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log('[DEBUG][POST /api/patients] authenticated user id:', user.id);

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parseResult = patientSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: "Validation failed.", details: parseResult.error.format() }, { status: 400 });
  }

  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      // Provide defaults for DB-required fields when absent in the request.
      name: parseResult.data.name,
      phone: parseResult.data.phone ?? "",
      treatment: parseResult.data.treatment ?? "",
      appointmentDate: parseResult.data.appointmentDate ?? "",
      clinicName: parseResult.data.clinicName ?? null,
      clinicColor: parseResult.data.clinicColor ?? null,
      address: parseResult.data.address ?? null,
      age: parseResult.data.age ?? null,
      occupation: parseResult.data.occupation ?? null,
      bracketType: parseResult.data.bracketType ?? null,
      caseSheet: parseResult.data.caseSheet ?? null,
      attachments: parseResult.data.attachments ?? null,
      appointmentTime: parseResult.data.appointmentTime ?? null,
      firstAppointment: parseResult.data.firstAppointment ?? false,
      notes: parseResult.data.notes ?? null,
      plannedNotes: parseResult.data.plannedNotes ?? null,
      totalFee: parseResult.data.totalFee ?? null,
      totalPaid: parseResult.data.totalPaid ?? null,
      retainerFee: parseResult.data.retainerFee ?? null,
      elasticEnabled: parseResult.data.elasticEnabled ?? false,
      elasticType: parseResult.data.elasticType ?? null,
      tadsNote: parseResult.data.tadsNote ?? null,
      caseStatus: parseResult.data.caseStatus ?? null,
      // Do not pass relational fields (visits/appointments) into create data.
      myofunctionalType: parseResult.data.myofunctionalType ?? null,
      myofunctionalProgram: parseResult.data.myofunctionalProgram ?? null,
      clearAlignersPlan: parseResult.data.clearAlignersPlan ?? null,
    },
  });

  console.log('[DEBUG][POST /api/patients] created patient object:', patient);

  const responsePayload = { ...patient, id: patient.id, userId: patient.userId };
  console.log('[DEBUG][POST /api/patients] response id:', responsePayload.id);

  // Return the created patient explicitly including id and userId to avoid
  // any client-side ambiguity about the returned shape.
  return NextResponse.json(responsePayload, { status: 201 });
}
