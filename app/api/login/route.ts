import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/app/lib/session";

export async function POST(req: Request) {
  try {
    // Lazy load Prisma inside request handler for Cloudflare Workers compatibility
    const { prisma } = await import("@/app/lib/prisma");

    // Read body as text to handle Cloudflare's quote stripping
    const bodyText = await req.text();
    
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      // Fix malformed JSON from Cloudflare
      const fixedBody = bodyText
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (match, value, end) => {
          if (value === 'true' || value === 'false' || value === 'null' || !isNaN(value)) {
            return `:${value}${end}`;
          }
          return `:"${value}"${end}`;
        });
      body = JSON.parse(fixedBody);
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session
    await createSessionCookie(user.id);

    const response = NextResponse.json({
      ok: true,
      hasWhatsapp: !!user.whatsappPhone,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    // Set whatsapp_configured cookie so middleware can check without DB hit
    if (user.whatsappPhone) {
      response.cookies.set("whatsapp_configured", "1", {
        httpOnly: false,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object") {
      errorMessage = (error as any).message || JSON.stringify(error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Login failed",
        debug: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    id: "dev-user",
    name: "Developer",
    email: "dev@example.com",
  });
}