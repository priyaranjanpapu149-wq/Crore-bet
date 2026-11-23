-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "twofaSecret" TEXT,
    "twofaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "wallet" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "mPin" TEXT,
    "referCode" TEXT,
    "referredBy" TEXT,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holderName" TEXT,
    "accountNo" TEXT,
    "ifsc" TEXT,
    "upi" TEXT,
    "phonepe" TEXT,
    "gpay" TEXT,
    "paytm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'regular',
    "openTime" TEXT,
    "closeTime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "session" TEXT,
    "digits" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payout" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "starline_bets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "digits" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bidDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "starline_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rates" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "payout" DECIMAL(10,2) NOT NULL,
    "minBet" DECIMAL(15,2) NOT NULL DEFAULT 10,
    "maxBet" DECIMAL(15,2) NOT NULL DEFAULT 10000,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "openResult" TEXT,
    "closeResult" TEXT,
    "jodiResult" TEXT,
    "pannaResult" TEXT,
    "resultDate" TIMESTAMP(3) NOT NULL,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" INTEGER NOT NULL,
    "remark" TEXT NOT NULL,
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "gameId" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bankId" TEXT,
    "remark" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_bonuses" (
    "id" TEXT NOT NULL,
    "min" DECIMAL(15,2) NOT NULL,
    "max" DECIMAL(15,2) NOT NULL,
    "bonus" DECIMAL(15,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "deposit_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upi_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "utr" TEXT,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upi_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerMobile" TEXT NOT NULL,
    "referrerName" TEXT,
    "referrerPhone" TEXT,
    "refereeMobile" TEXT NOT NULL,
    "refereeName" TEXT,
    "referralCode" TEXT NOT NULL,
    "depositAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "cashbackAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "minDeposit" DECIMAL(15,2) NOT NULL DEFAULT 100,
    "minBet" DECIMAL(15,2) NOT NULL DEFAULT 10,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configs" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "minVersion" TEXT,
    "updateUrl" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_refreshToken_key" ON "admin_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "admin_sessions_adminId_idx" ON "admin_sessions"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_createdAt_idx" ON "audit_logs"("adminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referCode_key" ON "users"("referCode");

-- CreateIndex
CREATE INDEX "users_mobile_idx" ON "users"("mobile");

-- CreateIndex
CREATE INDEX "users_referCode_idx" ON "users"("referCode");

-- CreateIndex
CREATE INDEX "users_referredBy_idx" ON "users"("referredBy");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshToken_key" ON "user_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_details_userId_key" ON "bank_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "markets_name_key" ON "markets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "markets_slug_key" ON "markets"("slug");

-- CreateIndex
CREATE INDEX "bids_userId_bidDate_idx" ON "bids"("userId", "bidDate");

-- CreateIndex
CREATE INDEX "bids_marketId_bidDate_idx" ON "bids"("marketId", "bidDate");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "bids"("status");

-- CreateIndex
CREATE INDEX "starline_bets_userId_bidDate_idx" ON "starline_bets"("userId", "bidDate");

-- CreateIndex
CREATE INDEX "starline_bets_marketName_bidDate_idx" ON "starline_bets"("marketName", "bidDate");

-- CreateIndex
CREATE UNIQUE INDEX "rates_marketId_gameType_key" ON "rates"("marketId", "gameType");

-- CreateIndex
CREATE INDEX "results_marketId_resultDate_idx" ON "results"("marketId", "resultDate");

-- CreateIndex
CREATE INDEX "transactions_userId_createdAt_idx" ON "transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "withdrawals_userId_createdAt_idx" ON "withdrawals"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "withdrawals_status_idx" ON "withdrawals"("status");

-- CreateIndex
CREATE INDEX "upi_verifications_userId_idx" ON "upi_verifications"("userId");

-- CreateIndex
CREATE INDEX "upi_verifications_status_idx" ON "upi_verifications"("status");

-- CreateIndex
CREATE INDEX "referrals_referrerMobile_idx" ON "referrals"("referrerMobile");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_refereeMobile_key" ON "referrals"("refereeMobile");

-- CreateIndex
CREATE INDEX "otp_sessions_mobile_purpose_idx" ON "otp_sessions"("mobile", "purpose");

-- CreateIndex
CREATE INDEX "otp_sessions_verificationId_idx" ON "otp_sessions"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "api_games_name_key" ON "api_games"("name");

-- CreateIndex
CREATE UNIQUE INDEX "api_games_slug_key" ON "api_games"("slug");

-- CreateIndex
CREATE INDEX "chat_messages_userId_createdAt_idx" ON "chat_messages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "starline_bets" ADD CONSTRAINT "starline_bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upi_verifications" ADD CONSTRAINT "upi_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
