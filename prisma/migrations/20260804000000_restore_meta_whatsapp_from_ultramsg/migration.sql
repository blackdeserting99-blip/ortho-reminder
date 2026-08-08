/*
  Replaces UltraMsg doctor credential columns with Meta WhatsApp Cloud API columns.
*/

ALTER TABLE "User"
DROP COLUMN IF EXISTS "ultraMsgApiToken",
DROP COLUMN IF EXISTS "ultraMsgConnectedAt",
DROP COLUMN IF EXISTS "ultraMsgInstanceId",
ADD COLUMN IF NOT EXISTS "whatsappAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappConnectedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" TEXT;
