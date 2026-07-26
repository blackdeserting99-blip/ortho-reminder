import { cookies } from "next/headers";
import {
  clearSessionCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
} from "@/app/lib/session";

export {
  clearSessionCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
};

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await getSessionFromCookieValue(cookieValue);
    if (!session?.userId) return null;

    try {
      const { prisma } = await import("@/app/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, name: true, email: true, whatsappPhone: true },
      });
      if (user) return user;
    } catch {
      // Cloudflare Prisma runtime can fail if engine artifact is unavailable.
      // In that case, trust the signed session and let route-level DB code verify data access.
    }

    return {
      id: session.userId,
      name: null,
      email: "",
      whatsappPhone: null,
    };
  } catch {
    return null;
  }
}