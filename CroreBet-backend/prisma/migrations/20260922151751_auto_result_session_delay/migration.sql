-- AlterTable
ALTER TABLE "auto_result_configs" ADD COLUMN     "delayMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "session" TEXT NOT NULL DEFAULT 'open';
