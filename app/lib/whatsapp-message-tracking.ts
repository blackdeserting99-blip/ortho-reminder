type JsonRecord = Record<string, unknown>;

function asJson(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

export async function recordOutboundWhatsAppMessage(input: {
  userId?: string;
  providerMessageId?: string;
  phoneNumberId: string;
  recipientPhone: string;
  messageType: "text" | "template";
  providerPayload?: unknown;
}) {
  if (!input.userId || !input.providerMessageId) {
    return;
  }

  try {
    const { prisma } = await import("@/app/lib/prisma");
    await prisma.whatsAppMessage.upsert({
      where: { providerMessageId: input.providerMessageId },
      create: {
        userId: input.userId,
        providerMessageId: input.providerMessageId,
        phoneNumberId: input.phoneNumberId,
        recipientPhone: input.recipientPhone,
        direction: "OUTBOUND",
        messageType: input.messageType.toUpperCase(),
        status: "ACCEPTED",
        providerPayload: asJson(input.providerPayload) as never,
        eventAt: new Date(),
      },
      update: {
        status: "ACCEPTED",
        providerPayload: asJson(input.providerPayload) as never,
        eventAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[whatsapp] Failed to persist outbound message", error);
  }
}

export async function recordWhatsAppWebhookEvent(input: {
  phoneNumberId?: string;
  providerMessageId?: string;
  status?: string;
  recipientPhone?: string;
  timestamp?: number | string;
  error?: string;
  raw?: unknown;
}) {
  if (!input.providerMessageId) {
    return;
  }

  try {
    const { prisma } = await import("@/app/lib/prisma");
    const eventAt = input.timestamp
      ? typeof input.timestamp === "number"
        ? new Date(input.timestamp * 1000)
        : new Date(input.timestamp)
      : new Date();
    const existing = await prisma.whatsAppMessage.findUnique({
      where: { providerMessageId: input.providerMessageId },
    });

    if (existing) {
      const existingPayload = asJson(existing.providerPayload);
      const rawPayload = asJson(input.raw);
      const errorText = `${input.error || ""} ${JSON.stringify(input.raw || {})}`;
      const isOutsideWindow =
        /1340|131047|outside allowed window|more than 24 hours/i.test(errorText);
      const templateFallback = asJson(existingPayload?._vonageTemplateFallback);
      const fallbackAttempted = existingPayload?._vonageTemplateFallbackAttempted === true;
      const shouldSendTemplateFallback =
        existing.direction === "OUTBOUND" &&
        existing.messageType === "TEXT" &&
        isOutsideWindow &&
        Boolean(templateFallback?.name) &&
        Boolean(templateFallback?.locale) &&
        Array.isArray(templateFallback?.parameters) &&
        !fallbackAttempted;
      const mergedPayload = {
        ...(existingPayload || {}),
        ...(rawPayload || {}),
        ...(shouldSendTemplateFallback ? { _vonageTemplateFallbackAttempted: true } : {}),
      };

      await prisma.whatsAppMessage.update({
        where: { providerMessageId: input.providerMessageId },
        data: {
          status: input.status?.toUpperCase() || existing.status,
          error: input.error || null,
          providerPayload: mergedPayload as never,
          eventAt,
        },
      });

      if (shouldSendTemplateFallback) {
        const { sendVonageWhatsAppTemplate } = await import("@/app/lib/whatsapp");
        await sendVonageWhatsAppTemplate(
          input.recipientPhone || existing.recipientPhone || "",
          {
            name: String(templateFallback?.name),
            locale: String(templateFallback?.locale),
            parameters: (templateFallback?.parameters as unknown[]).map(String),
          },
          existing.userId
        );
      }
      return;
    }

    if (!input.phoneNumberId) {
      return;
    }

    const doctor = await prisma.user.findFirst({
      where: { whatsappPhoneNumberId: input.phoneNumberId },
      select: { id: true },
    });
    if (!doctor) {
      return;
    }

    await prisma.whatsAppMessage.create({
      data: {
        userId: doctor.id,
        providerMessageId: input.providerMessageId,
        phoneNumberId: input.phoneNumberId,
        recipientPhone: input.recipientPhone || null,
        direction: "INBOUND",
        messageType: "WEBHOOK",
        status: input.status?.toUpperCase() || "RECEIVED",
        error: input.error || null,
        providerPayload: asJson(input.raw) as never,
        eventAt,
      },
    });
  } catch (error) {
    console.error("[whatsapp] Failed to persist webhook event", error);
  }
}