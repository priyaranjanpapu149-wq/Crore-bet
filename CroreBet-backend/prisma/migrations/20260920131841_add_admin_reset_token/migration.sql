-- CreateTable
CREATE TABLE "admin_reset_tokens" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_reset_tokens_tokenHash_key" ON "admin_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_reset_tokens_email_idx" ON "admin_reset_tokens"("email");
