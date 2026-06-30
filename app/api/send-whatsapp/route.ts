import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { phone, message, reminderType } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    );
  }

  // TODO: replace this stub with your real WhatsApp Business API integration.
  // Example:
  // const result = await fetch("https://api.whatsapp.com/v1/messages", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     to: phone,
  //     type: "text",
  //     text: { body: message },
  //   }),
  // });

  return NextResponse.json({
    status: "ok",
    phone,
    reminderType,
  });
}
