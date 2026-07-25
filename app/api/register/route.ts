import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Lazy load Prisma inside request handler for Cloudflare Workers compatibility
    const { prisma } = await import("@/app/lib/prisma");

    // Read body as text first to handle Cloudflare's JSON quote stripping
    const bodyText = await req.text();
    
    // Parse JSON, handling the case where quotes might be stripped
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      // If standard JSON parsing fails, the body might have quotes stripped
      // Try to fix it by adding quotes back around property names and string values
      const fixedBody = bodyText
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (match, value, end) => {
          // Add quotes around unquoted string values (but not numbers/booleans)
          if (value === 'true' || value === 'false' || value === 'null' || !isNaN(value)) {
            return `:${value}${end}`;
          }
          return `:"${value}"${end}`;
        });
      body = JSON.parse(fixedBody);
    }

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
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
        error: "Register failed",
        debug: errorMessage,
      },
      { status: 500 }
    );
  }
}