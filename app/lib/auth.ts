import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import {
  clearSessionCookie,
  clearWhatsAppConfiguredCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
} from "@/app/lib/session";

export {
  clearSessionCookie,
  clearWhatsAppConfiguredCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
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

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await getSessionFromCookieValue(cookieValue);
    if (!session?.userId) return null;

    const cachedUser = {
      id: session.userId,
      name: session.name ?? null,
      email: session.email ?? "",
      whatsappPhone: session.whatsappPhone ?? null,
    };

    if (cachedUser.email || cachedUser.name || cachedUser.whatsappPhone) {
      return cachedUser;
    }

    try {
      const { prisma } = await import("@/app/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, whatsappPhone: true },
      });
      if (user) return user;
    } catch {
      const connectionString = getDatabaseUrl();
      if (connectionString) {
        try {
          const sql = neon(connectionString);
          const rows = await sql`
            SELECT id, name, email, "whatsappPhone"
            FROM "User"
            WHERE id = ${session.userId}
            LIMIT 1
          `;

          const row = rows?.[0];
          if (row) {
            return {
              id: String(row.id),
              name: row.name ? String(row.name) : null,
              email: String(row.email || ""),
              whatsappPhone: row.whatsappPhone ? String(row.whatsappPhone) : null,
            };
          }
        } catch {
          // Continue to signed-session fallback below.
        }
      }
    }

    return cachedUser;
  } catch {
    return null;
  }
}