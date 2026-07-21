import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { normalizePhone } from "@/app/lib/whatsapp";
import { readDoctorWhatsAppFromClinicMetadata } from "@/app/lib/doctor-whatsapp";

const updateSchema = z.object({
  phone: z.string().min(3),
});

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function getPrimaryClinic(ownerId: string) {
  return prisma.clinic.findFirst({
    where: { ownerId },
    orderBy: { id: "asc" },
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinic = await getPrimaryClinic(user.id);
  if (!clinic) {
    return NextResponse.json({ phone: "", source: "none" });
  }

  const fromMetadata = readDoctorWhatsAppFromClinicMetadata(clinic.metadata);
  const phone = fromMetadata || clinic.phone || "";
  const source = fromMetadata ? "metadata" : clinic.phone ? "clinicPhone" : "none";

  return NextResponse.json({ phone, source });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const clinic = await getPrimaryClinic(user.id);
  if (!clinic) {
    return NextResponse.json({ error: "No clinic found for this account" }, { status: 404 });
  }

  const normalized = normalizePhone(parsed.data.phone);
  const nextMetadata = {
    ...toObject(clinic.metadata),
    doctorWhatsappPhone: normalized,
  };

  await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      metadata: nextMetadata as any,
    },
  });

  return NextResponse.json({ ok: true, phone: normalized });
}
