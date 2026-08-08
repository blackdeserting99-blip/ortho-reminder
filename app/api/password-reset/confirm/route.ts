import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import {
  hashPasswordResetToken,
  parseRequestBody,
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

async function findUserByResetHash(tokenHash: string) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  const rows = await sql`
    SELECT id, email, "isDisabled", "passwordResetCodeHash", "passwordResetCodeExpiresAt"
    FROM "User"
    WHERE "passwordResetCodeHash" = ${tokenHash}
    LIMIT 1
  `;

  const row = rows?.[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email),
    isDisabled: Boolean(row.isDisabled),
    passwordResetCodeHash: row.passwordResetCodeHash ? String(row.passwordResetCodeHash) : null,
    passwordResetCodeExpiresAt: row.passwordResetCodeExpiresAt ? new Date(row.passwordResetCodeExpiresAt) : null,
  };
}

async function updatePasswordAndClearResetFields(email: string, passwordHash: string) {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  await sql`
    UPDATE "User"
    SET "passwordHash" = ${passwordHash},
        "passwordResetCodeHash" = NULL,
        "passwordResetCodeExpiresAt" = NULL,
        "passwordResetRequestedAt" = NULL,
        "updatedAt" = NOW()
    WHERE email = ${email}
  `;
}

export async function POST(req: Request) {
  try {
    const body = await parseRequestBody(req);
    const token = String(body.token ?? body.code ?? "").trim();
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Reset link token and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const tokenHash = await hashPasswordResetToken(token);
    const user = await findUserByResetHash(tokenHash);

    if (!user || user.isDisabled) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    if (!user.passwordResetCodeHash || !user.passwordResetCodeExpiresAt) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    if (user.passwordResetCodeExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Expired token." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await updatePasswordAndClearResetFields(user.email, passwordHash);

    return NextResponse.json({
      ok: true,
      message: "Your password has been reset. You can log in now.",
    });
  } catch (error) {
    console.error("[PASSWORD RESET CONFIRM ERROR]", error);
    return NextResponse.json(
      { error: "Unable to reset password right now." },
      { status: 500 }
    );
  }
}