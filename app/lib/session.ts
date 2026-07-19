import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "ortho_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-session-secret-change-me";
}

function base64UrlEncode(value: string): string {
  const binary = typeof btoa === "function"
    ? btoa(value)
    : Buffer.from(value, "utf8").toString("base64");

  return binary.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

async function signValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(String.fromCharCode(...Array.from(new Uint8Array(signature))));
}

async function encodeSessionPayload(payload: Record<string, unknown>): Promise<string> {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

async function decodeSessionPayload(value: string): Promise<Record<string, unknown> | null> {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload);
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createSessionValue(userId: string): Promise<string> {
  const sessionPayload = {
    userId,
    sessionId: crypto.randomUUID(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  return encodeSessionPayload(sessionPayload);
}

export async function getSessionFromCookieValue(cookieValue: string | undefined): Promise<{ userId: string } | null> {
  if (!cookieValue) {
    return null;
  }

  const payload = await decodeSessionPayload(cookieValue);

  if (!payload) {
    return null;
  }

  if (typeof payload.userId !== "string") {
    return null;
  }

  const expiresAt = payload.expiresAt;
  if (typeof expiresAt !== "number" || Date.now() > expiresAt) {
    return null;
  }

  return { userId: payload.userId };
}

export async function createSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionValue = await createSessionValue(userId);

  cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
