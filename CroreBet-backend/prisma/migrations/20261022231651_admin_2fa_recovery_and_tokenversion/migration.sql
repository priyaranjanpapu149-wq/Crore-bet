-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "twofaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "markets" ADD COLUMN     "shutdown" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastIp" TEXT,
ADD COLUMN     "lastLocation" TEXT;
