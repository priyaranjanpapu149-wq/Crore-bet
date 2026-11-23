/*
  Warnings:

  - Added the required column `site` to the `auto_result_configs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "auto_result_configs" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastCheck" TIMESTAMP(3),
ADD COLUMN     "site" TEXT NOT NULL,
ADD COLUMN     "siteUrl" TEXT,
ADD COLUMN     "sort" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'not_working';
