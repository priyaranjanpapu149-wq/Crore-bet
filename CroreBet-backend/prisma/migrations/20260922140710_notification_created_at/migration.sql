/*
  Warnings:

  - You are about to drop the column `data` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `notifications` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "notifications_type_idx";

-- DropIndex
DROP INDEX "notifications_userId_sentAt_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "data",
DROP COLUMN "imageUrl",
DROP COLUMN "read",
DROP COLUMN "sentAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
