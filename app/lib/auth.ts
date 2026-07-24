import {
  clearSessionCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
} from "@/app/lib/session";

export async function hashPassword(password: string): Promise<string> {
  console.log("==== FAKE HASH CALLED ====");
  return "TEST_HASH";
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  console.log("==== FAKE VERIFY CALLED ====");
  return hash === "TEST_HASH";
}

export {
  clearSessionCookie,
  createSessionCookie,
  getSessionFromCookieValue,
  SESSION_COOKIE_NAME,
};

export async function getCurrentUser() {
  return {
    id: "dev-user",
    name: "Developer",
    email: "dev@example.com",
  };
}