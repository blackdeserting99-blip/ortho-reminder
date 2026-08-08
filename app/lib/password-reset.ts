import { createHash, randomBytes } from "crypto";

const RESET_TOKEN_BYTES = 32;
const RESET_CODE_TTL_MINUTES = 60;

function getPasswordResetSecret() {
  return (
    process.env.PASSWORD_RESET_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-password-reset-secret-change-me"
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generatePasswordResetToken() {
  return randomBytes(RESET_TOKEN_BYTES).toString("base64url");
}

function hashToHex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPasswordResetToken(token: string) {
  return hashToHex(`${getPasswordResetSecret()}:${token}`);
}

export async function verifyPasswordResetToken(token: string, expectedHash: string) {
  const actualHash = await hashPasswordResetToken(token);
  return actualHash === expectedHash;
}

export function getPasswordResetExpiresAt() {
  return new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
}

export async function parseRequestBody(req: Request) {
  const bodyText = await req.text();

  try {
    return JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    const fixedBody = bodyText
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/:\s*([^{,}\[\]":\s]+?)([,}])/g, (match, value, end) => {
        if (value === "true" || value === "false" || value === "null" || !isNaN(Number(value))) {
          return `:${value}${end}`;
        }
        return `:"${value}"${end}`;
      });

    return JSON.parse(fixedBody) as Record<string, unknown>;
  }
}

export function buildPasswordResetEmail(resetUrl: string, code: string) {
  return {
    subject: "Your Ortho Assistant password reset code",
    text: [
      `Reset your password here: ${resetUrl}`,
      `If your email client does not open the link, use this reset token: ${code}`,
      "",
      "This reset link expires in 1 hour.",
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e2e8f0">
          <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#0f766e;font-weight:700">Ortho Assistant</div>
          <h1 style="margin:16px 0 12px;font-size:28px;line-height:1.2">Reset your password</h1>
          <p style="margin:0 0 20px;color:#475569;font-size:16px">Click the button below to open a secure password reset page. It expires in 1 hour.</p>
          <div style="text-align:center;margin:24px 0 20px;">
            <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px">Reset password</a>
          </div>
          <div style="font-size:14px;line-height:1.7;background:#ecfeff;border:1px solid #67e8f9;border-radius:16px;padding:16px 20px;color:#155e75;word-break:break-all">${code}</div>
          <p style="margin:20px 0 0;color:#64748b;font-size:14px">If you did not request this reset, you can ignore this email.</p>
        </div>
      </div>
    `,
  };
}

type PasswordResetConfig = {
  apiKey: string;
  from: string;
};

export function getResendPasswordResetConfig(): PasswordResetConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

async function postResendEmail(apiKey: string, payload: Record<string, unknown>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: Response;

    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (attempt === 3) {
        throw new Error(`Resend request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      continue;
    }

    if (response.ok) {
      return;
    }

    const details = await response.text();
    const retryable = response.status === 429 || response.status >= 500;

    if (!retryable || attempt === 3) {
      throw new Error(`Resend request failed with ${response.status}: ${details}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, token: string) {
  const config = getResendPasswordResetConfig();
  if (!config) {
    return { ok: false, skipped: true, reason: "email-delivery-not-configured" };
  }

  const { apiKey, from } = config;
  const email = buildPasswordResetEmail(resetUrl, token);

  await postResendEmail(apiKey, {
    from,
    to: [to],
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  return { ok: true };
}