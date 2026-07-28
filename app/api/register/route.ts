import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

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

const getSqlClient = () => {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL/NEON_DATABASE_URL is not configured");
  }
  return neon(url);
};

const getRuntimeDiagnostics = () => ({
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  hasNeonDatabaseUrl: Boolean(process.env.NEON_DATABASE_URL),
  nodeEnv: process.env.NODE_ENV || "unknown",
  runtime: process.env.NEXT_RUNTIME || "unknown",
});

export async function POST(req: Request) {
  try {
    console.log("[DEBUG][POST /api/register] runtime diagnostics:", getRuntimeDiagnostics());
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

    let existingUser: { id: string } | null = null;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
    } catch (findError) {
      console.error("[REGISTER ERROR][prisma.findUnique]", findError);
      const sql = getSqlClient();
      const rows = await sql`
        SELECT id
        FROM "User"
        WHERE email = ${String(email).trim()}
        LIMIT 1
      `;
      existingUser = rows?.[0] ? { id: String(rows[0].id) } : null;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user: { id: string; email: string };
    try {
      const created = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
        },
      });
      user = created;
    } catch (createError) {
      console.error("[REGISTER ERROR][prisma.create]", createError);
      const sql = getSqlClient();
      const rows = await sql`
        INSERT INTO "User" (
          name,
          email,
          "passwordHash",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${String(name).trim()},
          ${String(email).trim()},
          ${passwordHash},
          NOW(),
          NOW()
        )
        RETURNING id, email
      `;

      if (!rows?.[0]) {
        throw new Error("SQL fallback register insert returned no row");
      }

      user = {
        id: String(rows[0].id),
        email: String(rows[0].email),
      };
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    console.error("[REGISTER ERROR][runtime diagnostics]", getRuntimeDiagnostics());

    return NextResponse.json(
      {
        ok: false,
        error: "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}