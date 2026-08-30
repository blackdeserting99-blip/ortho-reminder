import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionValue, SESSION_COOKIE_NAME } from "@/app/lib/session";
import { neon } from "@neondatabase/serverless";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getDatabaseUrl() {
  const primary = process.env.DATABASE_URL;
  if (primary && primary !== "undefined" && primary.trim().length > 0) {
    return primary;
  }

  const fallback = process.env.NEON_DATABASE_URL;
  if (fallback && fallback !== "undefined" && fallback.trim().length > 0) {
    return fallback;
  }

  return null;
}

export async function POST(req: Request) {
  let parsedEmail = "";
  let parsedPassword = "";

  try {
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
    parsedEmail = String(email || "").trim();
    parsedPassword = String(password || "");

    if (!parsedEmail || !parsedPassword) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Try Prisma first.
    let user: any = null;
    try {
      const { prisma } = await import("@/app/lib/prisma");
      user = await prisma.user.findUnique({
        where: { email: parsedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          whatsappPhone: true,
          whatsappBusinessAccountId: true,
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          role: true,
          isDisabled: true,
        },
      });
    } catch {
      // Fallback path for Cloudflare deployments where Prisma engine artifacts are missing.
      const connectionString = getDatabaseUrl();
      if (!connectionString) {
        throw new Error("DATABASE_URL is not configured");
      }
      const sql = neon(connectionString);
      const rows = await sql`
        SELECT id, email, name, "passwordHash", "whatsappPhone", "whatsappBusinessAccountId", "whatsappPhoneNumberId", "whatsappAccessToken", role, "isDisabled"
        FROM "User"
        WHERE email = ${parsedEmail}
        LIMIT 1
      `;
      user = rows?.[0] ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if ((user as any).isDisabled) {
      return NextResponse.json(
        { error: "Account disabled. Contact support." },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(parsedPassword, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const hasWhatsapp = Boolean(
      (user as any).whatsappBusinessAccountId &&
        (user as any).whatsappPhoneNumberId &&
        (user as any).whatsappAccessToken
    );

    const sessionValue = await createSessionValue(user.id, {
      name: user.name,
      email: user.email,
      whatsappPhone: user.whatsappPhone,
    });

    const response = NextResponse.json({
      ok: true,
      hasWhatsapp,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role || "DOCTOR",
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    // Set whatsapp_configured cookie so middleware can check without DB hit
    if (hasWhatsapp) {
      response.cookies.set("whatsapp_configured", "1", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    } else {
      response.cookies.set("whatsapp_configured", "", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    // Last-resort fallback: if Prisma path failed, try direct SQL login.
    if (parsedEmail && parsedPassword) {
      try {
        const connectionString = getDatabaseUrl();
        if (!connectionString) {
          throw new Error("DATABASE_URL is not configured");
        }
        const sql = neon(connectionString);
        const rows = await sql`
          SELECT id, email, name, "passwordHash", "whatsappPhone", "whatsappBusinessAccountId", "whatsappPhoneNumberId", "whatsappAccessToken", role, "isDisabled"
          FROM "User"
          WHERE email = ${parsedEmail}
          LIMIT 1
        `;
        const user = rows?.[0] ?? null;

        if (!user) {
          return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 }
          );
        }

        if ((user as any).isDisabled) {
          return NextResponse.json(
            { error: "Account disabled. Contact support." },
            { status: 403 }
          );
        }

        const passwordMatch = await bcrypt.compare(parsedPassword, user.passwordHash);
        if (!passwordMatch) {
          return NextResponse.json(
            { error: "Invalid email or password" },
            { status: 401 }
          );
        }

        const hasWhatsapp = Boolean(
          (user as any).whatsappBusinessAccountId &&
            (user as any).whatsappPhoneNumberId &&
            (user as any).whatsappAccessToken
        );

        const sessionValue = await createSessionValue(user.id, {
          name: user.name,
          email: user.email,
          whatsappPhone: user.whatsappPhone,
        });

        const response = NextResponse.json({
          ok: true,
          hasWhatsapp,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user as any).role || "DOCTOR",
          },
        });

        response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: SESSION_MAX_AGE_SECONDS,
          path: "/",
        });

        if (hasWhatsapp) {
          response.cookies.set("whatsapp_configured", "1", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          });
        } else {
          response.cookies.set("whatsapp_configured", "", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 0,
            path: "/",
          });
        }

        return response;
      } catch {
        // Fall through to diagnostic response below.
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Login failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
