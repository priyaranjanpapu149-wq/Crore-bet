/*
  Warnings:

  - You are about to drop the column `apiSource` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `apiUrl` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `autoDeclare` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `delayMin` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `lastRunAt` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `marketId` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `marketName` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `session` on the `auto_result_configs` table. All the data in the column will be lost.
  - You are about to drop the column `sort` on the `auto_result_configs` table. All the data in the column will be lost.
  - Made the column `siteUrl` on table `auto_result_configs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "auto_result_configs_marketName_idx";

-- AlterTable
ALTER TABLE "auto_result_configs" DROP COLUMN "apiSource",
DROP COLUMN "apiUrl",
DROP COLUMN "autoDeclare",
DROP COLUMN "delayMin",
DROP COLUMN "enabled",
DROP COLUMN "lastRunAt",
DROP COLUMN "marketId",
DROP COLUMN "marketName",
DROP COLUMN "session",
DROP COLUMN "sort",
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "siteUrl" SET NOT NULL;
