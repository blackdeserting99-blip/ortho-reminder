import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Get DATABASE_URL from environment or use fallback
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  // Check if it's the Cloudflare "undefined" string
  if (url && url !== "undefined" && url.length > 0) {
    return url;
  }
  // Fallback: Try common Neon connection patterns
  if (process.env.NEON_DATABASE_URL) {
    return process.env.NEON_DATABASE_URL;
  }
  return null;
};

export async function POST(req: Request) {
  try {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Registration is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    // Temporarily inject DATABASE_URL for this request
    process.env.DATABASE_URL = dbUrl;

    // Lazy load Prisma inside request handler for Cloudflare Workers compatibility
    const { prisma } = await import("@/app/lib/prisma");

    // Read body as text first to handle Cloudflare's JSON quote stripping
    const bodyText = await req.text();
    
    // Parse JSON, handling the case where quotes might be stripped
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      // If standard JSON parsing fails, try to fix it
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
    console.error("[REGISTER ERROR]", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}