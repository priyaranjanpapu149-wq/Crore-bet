-- CreateTable
CREATE TABLE "gateway_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "merchantId" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "webhookKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "minAmount" DECIMAL(15,2) NOT NULL DEFAULT 100,
    "maxAmount" DECIMAL(15,2) NOT NULL DEFAULT 100000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_deposits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "gatewayTxnId" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rawResponse" TEXT,
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAmount" DECIMAL(15,2) NOT NULL DEFAULT 100,
    "maxAmount" DECIMAL(15,2) NOT NULL DEFAULT 50000,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdraw_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_result_configs" (
    "id" TEXT NOT NULL,
    "marketId" TEXT,
    "marketName" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "apiUrl" TEXT,
    "apiSource" TEXT NOT NULL DEFAULT 'manual',
    "autoDeclare" BOOLEAN NOT NULL DEFAULT false,
    "delayMin" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auto_result_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_histories" (
    "id" TEXT NOT NULL,
    "configId" TEXT,
    "marketName" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "resultValue" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "message" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_open_close" (
    "id" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "resultDate" TIMESTAMP(3) NOT NULL,
    "openPanna" TEXT,
    "openDigit" TEXT,
    "closePanna" TEXT,
    "closeDigit" TEXT,
    "jodi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_open_close_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "starline_markets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "starline_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "starline_timings" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "starline_timings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "starline_results" (
    "id" TEXT NOT NULL,
    "marketName" TEXT NOT NULL,
    "resultDate" TIMESTAMP(3) NOT NULL,
    "openPanna" TEXT,
    "openDigit" TEXT,
    "closePanna" TEXT,
    "closeDigit" TEXT,
    "jodi" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "starline_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_sliders" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_sliders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_sliders_website" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_sliders_website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessage" TEXT,
    "lastMsgAt" TIMESTAMP(3),
    "unreadAdmin" INTEGER NOT NULL DEFAULT 0,
    "unreadUser" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_chats" (
    "id" TEXT NOT NULL,
    "fromAdmin" TEXT NOT NULL,
    "toAdmin" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "data" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gateway_configs_name_key" ON "gateway_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "auto_deposits_orderId_key" ON "auto_deposits"("orderId");

-- CreateIndex
CREATE INDEX "auto_deposits_userId_createdAt_idx" ON "auto_deposits"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "auto_deposits_status_idx" ON "auto_deposits"("status");

-- CreateIndex
CREATE INDEX "auto_deposits_gateway_orderId_idx" ON "auto_deposits"("gateway", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_options_name_key" ON "withdraw_options"("name");

-- CreateIndex
CREATE INDEX "auto_result_configs_marketName_idx" ON "auto_result_configs"("marketName");

-- CreateIndex
CREATE INDEX "auto_histories_marketName_runAt_idx" ON "auto_histories"("marketName", "runAt");

-- CreateIndex
CREATE INDEX "auto_histories_status_idx" ON "auto_histories"("status");

-- CreateIndex
CREATE INDEX "chart_open_close_marketName_resultDate_idx" ON "chart_open_close"("marketName", "resultDate");

-- CreateIndex
CREATE UNIQUE INDEX "chart_open_close_marketName_resultDate_key" ON "chart_open_close"("marketName", "resultDate");

-- CreateIndex
CREATE UNIQUE INDEX "starline_markets_name_key" ON "starline_markets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "starline_markets_slug_key" ON "starline_markets"("slug");

-- CreateIndex
CREATE INDEX "starline_timings_marketId_idx" ON "starline_timings"("marketId");

-- CreateIndex
CREATE INDEX "starline_results_marketName_resultDate_idx" ON "starline_results"("marketName", "resultDate");

-- CreateIndex
CREATE UNIQUE INDEX "starline_results_marketName_resultDate_key" ON "starline_results"("marketName", "resultDate");

-- CreateIndex
CREATE UNIQUE INDEX "contents_slug_key" ON "contents"("slug");

-- CreateIndex
CREATE INDEX "ideas_userId_idx" ON "ideas"("userId");

-- CreateIndex
CREATE INDEX "ideas_status_idx" ON "ideas"("status");

-- CreateIndex
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "admin_chats_fromAdmin_toAdmin_createdAt_idx" ON "admin_chats"("fromAdmin", "toAdmin", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_sentAt_idx" ON "notifications"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
