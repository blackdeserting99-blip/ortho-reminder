import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/app/lib/auth";
import {
  buildDoctorWhatsAppCredentials,
  testWhatsAppConnection,
} from "@/app/lib/whatsapp";

const testSchema = z.object({
  whatsappPhoneNumberId: z.string().min(1),
  whatsappAccessToken: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Meta Phone Number ID and Access Token are required" },
      { status: 400 }
    );
  }

  const credentials = await buildDoctorWhatsAppCredentials({
    whatsappPhoneNumberId: parsed.data.whatsappPhoneNumberId,
    whatsappAccessToken: parsed.data.whatsappAccessToken,
  });
  const result = await testWhatsAppConnection(credentials);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || "Failed to connect to Meta WhatsApp Cloud API",
        provider: result.provider,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, provider: result.provider });
}