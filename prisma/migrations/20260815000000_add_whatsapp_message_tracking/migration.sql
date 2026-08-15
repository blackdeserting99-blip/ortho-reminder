CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "direction" TEXT NOT NULL,
    "messageType" TEXT,
    "status" TEXT,
    "error" TEXT,
    "providerPayload" JSONB,
    "eventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key" ON "WhatsAppMessage"("providerMessageId");
CREATE INDEX "WhatsAppMessage_userId_createdAt_idx" ON "WhatsAppMessage"("userId", "createdAt");
CREATE INDEX "WhatsAppMessage_phoneNumberId_idx" ON "WhatsAppMessage"("phoneNumberId");

ALTER TABLE "WhatsAppMessage"
ADD CONSTRAINT "WhatsAppMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;