import { neon } from "@neondatabase/serverless";

export type AuditLogInput = {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress?: string | null;
};

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

function getSqlClient() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(connectionString);
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    const { prisma } = await import("@/app/lib/prisma");
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      },
    });
    return;
  } catch {
    // Fall through to SQL fallback for Cloudflare runtime environments.
  }

  try {
    const sql = getSqlClient();
    await sql`
      INSERT INTO "AuditLog" (
        "userId",
        action,
        "targetType",
        "targetId",
        "ipAddress",
        "createdAt"
      ) VALUES (
        ${input.userId},
        ${input.action},
        ${input.targetType},
        ${input.targetId},
        ${input.ipAddress || null},
        NOW()
      )
    `;
  } catch (error) {
    console.error("[AUDIT LOG ERROR]", error);
  }
}
