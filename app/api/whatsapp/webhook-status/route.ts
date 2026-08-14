import { NextResponse } from "next/server";
import { getWhatsAppWebhookEvents } from "@/app/lib/whatsapp-webhook";

export async function GET() {
  const events = getWhatsAppWebhookEvents();
  return NextResponse.json({ ok: true, events });
}
