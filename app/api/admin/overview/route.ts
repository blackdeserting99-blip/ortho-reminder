import { NextResponse } from "next/server";
import { asAdminErrorResponse, getAdminOverview, requireAdmin } from "@/app/lib/admin";

export async function GET() {
  try {
    await requireAdmin();
    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return asAdminErrorResponse(error);
  }
}
