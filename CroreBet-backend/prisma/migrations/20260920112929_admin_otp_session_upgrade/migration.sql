/*
  Warnings:

  - You are about to drop the column `codeHash` on the `admin_otps` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `admin_otps` table. All the data in the column will be lost.
  - Added the required column `otpHash` to the `admin_otps` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "admin_otps_email_purpose_idx";

-- AlterTable
ALTER TABLE "admin_otps" DROP COLUMN "codeHash",
DROP COLUMN "purpose",
ADD COLUMN     "otpHash" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'login';

-- AlterTable
ALTER TABLE "admin_sessions" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "admin_otps_email_type_idx" ON "admin_otps"("email", "type");

-- CreateIndex
CREATE INDEX "admin_sessions_refreshToken_idx" ON "admin_sessions"("refreshToken");
