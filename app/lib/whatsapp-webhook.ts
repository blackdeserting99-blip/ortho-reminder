export type WhatsAppWebhookStatusEntry = {
  receivedAt: string;
  source: string;
  messageId?: string;
  status?: string;
  recipientId?: string;
  timestamp?: number;
  conversationId?: string;
  error?: string;
  raw?: unknown;
};

type WhatsAppWebhookIncomingEntry = Omit<
  WhatsAppWebhookStatusEntry,
  "receivedAt" | "source"
>;

const whatsappWebhookEvents: WhatsAppWebhookStatusEntry[] = [];

export function recordWhatsAppWebhookEvents(entries: WhatsAppWebhookIncomingEntry[]) {
  const now = new Date().toISOString();
  whatsappWebhookEvents.unshift(
    ...entries.map((entry) => ({
      receivedAt: now,
      source: "whatsapp_webhook",
      ...entry,
    }))
  );

  if (whatsappWebhookEvents.length > 100) {
    whatsappWebhookEvents.length = 100;
  }
}

export function getWhatsAppWebhookEvents() {
  return whatsappWebhookEvents;
}
