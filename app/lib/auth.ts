import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { clearSessionCookie, createSessionCookie, getSessionFromCookieValue, SESSION_COOKIE_NAME } from "@/app/lib/session";
import { cookies } from "next/headers";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { clearSessionCookie, createSessionCookie, getSessionFromCookieValue, SESSION_COOKIE_NAME };

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = await getSessionFromCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}
