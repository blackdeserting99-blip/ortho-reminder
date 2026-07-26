import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { sendWhatsAppText } from "@/app/lib/whatsapp";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { phone, message, reminderType } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    );
  }

  const result = await sendWhatsAppText(phone, message);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Failed to send WhatsApp message",
        details: result.error || "Unknown provider error",
        provider: result.provider,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    status: "ok",
    phone,
    reminderType,
    provider: result.provider,
    messageId: result.messageId || null,
  });
}
