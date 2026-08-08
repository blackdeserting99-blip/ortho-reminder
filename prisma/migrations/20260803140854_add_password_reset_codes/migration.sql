-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetCodeHash" TEXT,
ADD COLUMN     "passwordResetRequestedAt" TIMESTAMP(3);
