import { NextResponse } from "next/server";
import { recordWhatsAppWebhookEvent } from "@/app/lib/whatsapp-message-tracking";

const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
const appSecret = process.env.META_APP_SECRET?.trim();

type MetaWebhookStatus = {
  id?: unknown;
  message_id?: unknown;
  status?: unknown;
  statuses?: unknown;
  recipient_id?: unknown;
  wa_id?: unknown;
  timestamp?: unknown;
  conversation?: { id?: unknown };
  errors?: Array<{ title?: unknown; code?: unknown }>;
};

type MetaIncomingMessage = {
  id?: unknown;
  status?: unknown;
  from?: unknown;
  wa_id?: unknown;
  timestamp?: unknown;
};

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEquals(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function isValidSignature(rawBody: string, signature: string | null) {
  if (!appSecret || !signature?.startsWith("sha256=")) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return constantTimeEquals(`sha256=${toHex(digest)}`, signature);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!appSecret) {
    return NextResponse.json({ error: "Webhook signing is not configured" }, { status: 503 });
  }

  if (!(await isValidSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return null;
    }
  })() as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          statuses?: MetaWebhookStatus[];
          messages?: MetaIncomingMessage[];
        };
      }>;
    }>;
  } | null;

  const events: Array<{
    phoneNumberId?: string;
    messageId?: string;
    status?: string;
    recipientId?: string;
    timestamp?: number;
    conversationId?: string;
    error?: string;
    raw?: unknown;
  }> = [];

  if (payload?.entry && Array.isArray(payload.entry)) {
    for (const entry of payload.entry) {
      if (!entry?.changes || !Array.isArray(entry.changes)) continue;

      for (const change of entry.changes) {
        const value = change?.value;
        if (!value) continue;

        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;
        const statuses = value.statuses || [];
        if (Array.isArray(statuses)) {
          for (const status of statuses) {
            events.push({
              phoneNumberId,
              messageId: asOptionalString(status.id) || asOptionalString(status.message_id),
              status: asOptionalString(status.status) || asOptionalString(status.statuses),
              recipientId: asOptionalString(status.recipient_id) || asOptionalString(status.wa_id),
              timestamp: typeof status?.timestamp === "number" ? status.timestamp : undefined,
              conversationId: asOptionalString(status.conversation?.id),
              error: asOptionalString(status.errors?.[0]?.title) || asOptionalString(status.errors?.[0]?.code),
              raw: status,
            });
          }
        }

        if (value?.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            events.push({
              phoneNumberId,
              messageId: asOptionalString(message.id),
              status: asOptionalString(message.status),
              recipientId: asOptionalString(message.from) || asOptionalString(message.wa_id),
              timestamp: typeof message?.timestamp === "number" ? message.timestamp : undefined,
              raw: message,
            });
          }
        }

        if (events.length === 0) {
          events.push({ phoneNumberId, raw: value });
        }
      }
    }
  } else {
    events.push({ raw: payload });
  }

  await Promise.all(events.map((event) => recordWhatsAppWebhookEvent(event)));
  return NextResponse.json({ ok: true, received: events.length });
}
