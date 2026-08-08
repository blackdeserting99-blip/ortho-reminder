import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, clearWhatsAppConfiguredCookie } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  await clearWhatsAppConfiguredCookie();
  return NextResponse.redirect(new URL("/login", request.url));
}
