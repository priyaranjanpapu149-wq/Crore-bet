-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastDeviceId" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);
