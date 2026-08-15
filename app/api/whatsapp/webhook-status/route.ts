import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/app/lib/prisma");
  const events = await prisma.whatsAppMessage.findMany({
    where: { userId: user.id },
    select: {
      providerMessageId: true,
      phoneNumberId: true,
      recipientPhone: true,
      direction: true,
      messageType: true,
      status: true,
      error: true,
      eventAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, events });
}
