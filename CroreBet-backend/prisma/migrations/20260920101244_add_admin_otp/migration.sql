-- CreateTable
CREATE TABLE "admin_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_otps_email_purpose_idx" ON "admin_otps"("email", "purpose");
