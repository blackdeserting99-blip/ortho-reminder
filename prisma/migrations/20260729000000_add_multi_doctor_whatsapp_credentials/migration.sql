ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "whatsappBusinessAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappPhoneNumberId" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappConnectedAt" TIMESTAMP(3);
