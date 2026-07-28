import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";

function getEnv(name: string) {
  const value = (process.env[name] || "").trim();
  return value || null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = getEnv("META_APP_ID");
  const configId = getEnv("META_EMBEDDED_SIGNUP_CONFIG_ID");
  const callbackUrl = getEnv("CALLBACK_URL");

  if (!appId) {
    return NextResponse.json(
      { error: "META_APP_ID is not configured" },
      { status: 500 }
    );
  }

  if (!callbackUrl) {
    return NextResponse.json(
      { error: "CALLBACK_URL is not configured" },
      { status: 500 }
    );
  }

  if (!configId) {
    return NextResponse.json(
      { error: "META_EMBEDDED_SIGNUP_CONFIG_ID is not configured" },
      { status: 500 }
    );
  }

  const { prisma } = await import("@/app/lib/prisma");
  const doctor = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      whatsappBusinessAccountId: true,
      whatsappPhoneNumberId: true,
      whatsappConnectedAt: true,
    },
  });

  const connected = Boolean(
    doctor?.whatsappBusinessAccountId && doctor?.whatsappPhoneNumberId
  );

  return NextResponse.json({
    ok: true,
    appId,
    configId,
    callbackUrl,
    graphApiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    connected,
  });
}
