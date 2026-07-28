import { NextResponse } from "next/server";
import { z } from "zod";
import { asAdminErrorResponse, getAdminDoctors, requireAdmin, setDoctorDisabled } from "@/app/lib/admin";
import { recordAuditLog } from "@/app/lib/audit";

const disableSchema = z.object({
  doctorId: z.string().min(1),
  disabled: z.boolean(),
});

export async function GET() {
  try {
    await requireAdmin();
    const doctors = await getAdminDoctors();
    return NextResponse.json({ doctors });
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => null);

    const parsed = disableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const updated = await setDoctorDisabled(parsed.data.doctorId, parsed.data.disabled);
    if (!updated) {
      return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
    }

    if (parsed.data.disabled) {
      await recordAuditLog({
        userId: admin.id,
        action: "ADMIN_DISABLED_ACCOUNT",
        targetType: "USER",
        targetId: String(updated.id),
      });
    }

    return NextResponse.json({ ok: true, doctor: updated });
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}
