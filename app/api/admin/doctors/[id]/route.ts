import { NextResponse } from "next/server";
import { z } from "zod";
import { asAdminErrorResponse, deleteDoctorAccount, getAdminDoctorById, requireAdmin } from "@/app/lib/admin";
import { recordAuditLog } from "@/app/lib/audit";

const deleteSchema = z.object({
  confirm: z.literal("DELETE"),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const details = await getAdminDoctorById(id);
    if (!details) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Deletion requires explicit confirmation." }, { status: 400 });
    }

    const result = await deleteDoctorAccount(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    await recordAuditLog({
      userId: admin.id,
      action: "ADMIN_DELETED_ACCOUNT",
      targetType: "USER",
      targetId: String(result.doctor.id),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}
