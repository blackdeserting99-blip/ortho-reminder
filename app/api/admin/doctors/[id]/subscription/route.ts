import { NextResponse } from "next/server";
import { z } from "zod";
import { asAdminErrorResponse, requireAdmin, updateDoctorSubscription } from "@/app/lib/admin";
import { recordAuditLog } from "@/app/lib/audit";

const schema = z.object({
  subscriptionStatus: z.enum(["FREE", "ACTIVE", "EXPIRED", "SUSPENDED"]),
  subscriptionEndDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscription payload." }, { status: 400 });
    }

    const updated = await updateDoctorSubscription(
      id,
      parsed.data.subscriptionStatus,
      parsed.data.subscriptionEndDate ?? null
    );

    if (!updated) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    await recordAuditLog({
      userId: admin.id,
      action: "ADMIN_CHANGED_SUBSCRIPTION",
      targetType: "USER",
      targetId: id,
    });

    return NextResponse.json({ ok: true, doctor: updated });
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}
