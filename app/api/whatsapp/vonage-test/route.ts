import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hasVonageConfiguration,
  normalizePhone,
  sendWhatsAppText,
} from "@/app/lib/whatsapp";
import { getCurrentUser } from "@/app/lib/auth";

const requestSchema = z.object({
  phone: z.string().min(1),
});

const TEST_MESSAGE = "OrthoPrime Vonage WhatsApp test message.";

function safeError(error: unknown) {
  if (typeof error !== "string" || !error.trim()) {
    return "Vonage WhatsApp test failed.";
  }

  return error
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(?:token|secret|private\s*key|password)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 300);
}

function safeProviderError(payload: unknown) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const nested = body.error && typeof body.error === "object" && !Array.isArray(body.error)
    ? body.error as Record<string, unknown>
    : {};
  const read = (...values: unknown[]) => {
    const value = values.find((candidate) => typeof candidate === "string" || typeof candidate === "number");
    return value === undefined ? null : safeError(String(value));
  };

  return {
    code: read(nested.code, body.code),
    title: read(nested.title, body.title),
    detail: read(nested.detail, nested.message, body.detail, body.message),
  };
}

function getEndpointHostname(endpoint?: string | null) {
  if (!endpoint) {
    return "unknown";
  }

  try {
    return new URL(endpoint).hostname;
  } catch {
    return "unknown";
  }
}

export async function POST(request: Request) {
  let stage = "authentication";

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    stage = "configuration";
    if (!hasVonageConfiguration()) {
      return NextResponse.json(
        { ok: false, error: "Vonage WhatsApp configuration is incomplete." },
        { status: 503 }
      );
    }

    stage = "request parsing";
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Provide a test WhatsApp phone number." },
        { status: 400 }
      );
    }

    stage = "phone normalization";
    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { ok: false, error: "The test WhatsApp phone number is invalid." },
        { status: 400 }
      );
    }

    stage = "Vonage send";
    const result = await sendWhatsAppText(null, phone, TEST_MESSAGE, user.id);
    const statusCode = result.debug?.statusCode ?? null;

    if (!result.ok) {
      const providerError = safeProviderError(result.debug?.payload);
      const endpointHostname = getEndpointHostname(result.debug?.endpoint);
      const senderConfigured = Boolean(process.env.VONAGE_WHATSAPP_NUMBER?.trim());

      return NextResponse.json(
        {
          ok: false,
          applicationHttpStatus: 502,
          vonageHttpStatus: statusCode,
          vonageErrorCode: providerError.code,
          vonageErrorTitle: providerError.title,
          vonageErrorDetail: providerError.detail || safeError(result.error),
          endpointHostname,
          senderConfigured,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: result.ok,
        provider: result.provider,
        statusCode,
        messageId: result.messageId || null,
        error: result.ok ? null : safeError(result.error),
      },
      { status: result.ok ? 200 : 502 }
    );
  } catch (error) {
    console.error("[VONAGE_TEST_EXCEPTION]", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { ok: false, error: "Vonage WhatsApp test failed." },
      { status: 502 }
    );
  }
}
