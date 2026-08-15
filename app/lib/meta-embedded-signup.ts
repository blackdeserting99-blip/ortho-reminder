const STATE_COOKIE_NAME = "meta_embedded_signup_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;
const DEFAULT_APP_ID = "1405584521383883";
const DEFAULT_CONFIG_ID = "1527576741943888";
const DEFAULT_REDIRECT_URI = "https://orthoprimeoa.com/settings/whatsapp/meta/callback";

type SignupState = {
  userId: string;
  nonce: string;
  expiresAt: number;
};

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET is required for Meta Embedded Signup");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

export function getMetaEmbeddedSignupConfig() {
  return {
    appId: (process.env.META_APP_ID || DEFAULT_APP_ID).trim(),
    configId: (process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || DEFAULT_CONFIG_ID).trim(),
    graphVersion: (process.env.META_GRAPH_API_VERSION || "v23.0").trim(),
    redirectUri: (process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim(),
  };
}

export async function createMetaEmbeddedSignupState(userId: string) {
  const payload: SignupState = {
    userId,
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + STATE_MAX_AGE_SECONDS * 1000,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyMetaEmbeddedSignupState(value: string | undefined, userId: string) {
  if (!value) {
    return false;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature || (await sign(encoded)) !== signature) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SignupState;
    return payload.userId === userId && typeof payload.nonce === "string" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function getMetaEmbeddedSignupStateCookieName() {
  return STATE_COOKIE_NAME;
}

export function getMetaEmbeddedSignupStateMaxAge() {
  return STATE_MAX_AGE_SECONDS;
}