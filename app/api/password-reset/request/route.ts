import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  generatePasswordResetToken,
  getPasswordResetExpiresAt,
  getResendPasswordResetConfig,
  hashPasswordResetToken,
  normalizeEmail,
  parseRequestBody,
  sendPasswordResetEmail,
} from "@/app/lib/password-reset";

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

async function findUserByEmail(email: string) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  const rows = await sql`
    SELECT id, name, email, "isDisabled", "passwordResetRequestedAt"
    FROM "User"
    WHERE email = ${email}
    LIMIT 1
  `;

  const row = rows?.[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : null,
    email: String(row.email),
    isDisabled: Boolean(row.isDisabled),
    passwordResetRequestedAt: row.passwordResetRequestedAt ? new Date(row.passwordResetRequestedAt) : null,
  };
}

async function updateResetFields(email: string, tokenHash: string, expiresAt: Date, requestedAt: Date) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  await sql`
    UPDATE "User"
    SET "passwordResetCodeHash" = ${tokenHash},
        "passwordResetCodeExpiresAt" = ${expiresAt},
        "passwordResetRequestedAt" = ${requestedAt},
        "updatedAt" = NOW()
    WHERE email = ${email}
  `;
}

async function clearResetFields(email: string) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  await sql`
    UPDATE "User"
    SET "passwordResetCodeHash" = NULL,
        "passwordResetCodeExpiresAt" = NULL,
        "passwordResetRequestedAt" = NULL,
        "updatedAt" = NOW()
    WHERE email = ${email}
  `;
}

export async function POST(req: Request) {
  try {
    const body = await parseRequestBody(req);
    const email = normalizeEmail(String(body.email ?? ""));

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await findUserByEmail(email);

    if (!user || user.isDisabled) {
      return NextResponse.json({ ok: true, message: "If that email is registered, we sent a reset code." });
    }

    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60 * 1000) {
      return NextResponse.json({ error: "Please wait a moment before requesting another code." }, { status: 429 });
    }

    const token = generatePasswordResetToken();
    const tokenHash = await hashPasswordResetToken(token);
    const requestedAt = new Date();
    const expiresAt = getPasswordResetExpiresAt();
    const resetUrl = new URL("https://orthoprimeoa.com/reset-password");
    resetUrl.searchParams.set("token", token);

    await updateResetFields(email, tokenHash, expiresAt, requestedAt);

    try {
      const emailResult = await sendPasswordResetEmail(email, resetUrl.toString(), token);

      if (!emailResult.ok && !emailResult.skipped) {
        await clearResetFields(email);
        console.error("[PASSWORD RESET REQUEST][EMAIL ERROR]", emailResult);
        return NextResponse.json(
          {
            error: "Password reset email is temporarily unavailable.",
            details: emailResult.reason ?? "Unknown email delivery failure",
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: emailResult.skipped
          ? "Password reset link is ready, but email delivery is not configured on this server. Use the link below to continue."
          : "If that email is registered, we sent a reset code.",
        resetUrl: resetUrl.toString(),
        token,
        emailConfigured: !emailResult.skipped,
      });
    } catch (error) {
      await clearResetFields(email);
      console.error("[PASSWORD RESET REQUEST][EMAIL ERROR]", error);
      return NextResponse.json(
        {
          error: "Password reset email is temporarily unavailable.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[PASSWORD RESET REQUEST ERROR]", error);
    return NextResponse.json(
      {
        error: "Unable to process password reset request.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}