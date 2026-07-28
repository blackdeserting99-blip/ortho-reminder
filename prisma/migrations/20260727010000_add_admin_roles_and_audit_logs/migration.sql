-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DOCTOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'DOCTOR',
ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
ADD COLUMN "subscriptionEndDate" TIMESTAMP(3);

-- Promote owner account to ADMIN
UPDATE "User"
SET "role" = 'ADMIN'
WHERE email = 'lumident321@gmail.com';

-- CreateTable
CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
