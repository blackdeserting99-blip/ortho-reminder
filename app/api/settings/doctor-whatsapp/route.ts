import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/auth";
import { normalizePhone } from "@/app/lib/whatsapp";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ phone: (user as any).whatsappPhone || "" });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle Cloudflare Workers JSON quote-stripping
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    try {
      body = JSON.parse(text);
    } catch {
      const fixed = text
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (m, v, e) =>
          v === 'true' || v === 'false' || v === 'null' || !isNaN(v) ? `:${v}${e}` : `:"${v}"${e}`
        );
      body = JSON.parse(fixed);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (phone.length < 3) {
    return NextResponse.json({ error: "Phone number too short" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  const { prisma } = await import("@/app/lib/prisma");
  await prisma.user.update({
    where: { id: user.id },
    data: { whatsappPhone: normalized },
  });

  return NextResponse.json({ ok: true, phone: normalized });
}
