/*
  Warnings:

  - You are about to drop the column `whatsappAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappBusinessAccountId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappConnectedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappPhoneNumberId` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "whatsappAccessToken",
DROP COLUMN "whatsappBusinessAccountId",
DROP COLUMN "whatsappConnectedAt",
DROP COLUMN "whatsappPhoneNumberId",
ADD COLUMN     "ultraMsgApiToken" TEXT,
ADD COLUMN     "ultraMsgConnectedAt" TIMESTAMP(3),
ADD COLUMN     "ultraMsgInstanceId" TEXT;
