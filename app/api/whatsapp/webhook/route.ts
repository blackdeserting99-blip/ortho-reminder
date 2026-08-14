import { NextResponse } from "next/server";
import { recordWhatsAppWebhookEvents } from "@/app/lib/whatsapp-webhook";

const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

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
  const payload = await request.json().catch(() => null);

  const events: Array<{
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
        const statuses = value.statuses || [];
        if (Array.isArray(statuses)) {
          for (const status of statuses) {
            events.push({
              messageId: status?.id || status?.message_id || undefined,
              status: status?.status || status?.statuses || undefined,
              recipientId: status?.recipient_id || status?.wa_id || undefined,
              timestamp: typeof status?.timestamp === "number" ? status.timestamp : undefined,
              conversationId: status?.conversation?.id || undefined,
              error: status?.errors?.[0]?.title || status?.errors?.[0]?.code || undefined,
              raw: status,
            });
          }
        }

        if (value?.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            events.push({
              messageId: message?.id || undefined,
              status: message?.status || undefined,
              recipientId: message?.from || message?.wa_id || undefined,
              timestamp: typeof message?.timestamp === "number" ? message.timestamp : undefined,
              raw: message,
            });
          }
        }

        if (events.length === 0) {
          events.push({ raw: value });
        }
      }
    }
  } else {
    events.push({ raw: payload });
  }

  recordWhatsAppWebhookEvents(events);
  return NextResponse.json({ ok: true, received: events.length });
}
