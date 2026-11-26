CREATE TABLE "support_conversations" (
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "support_conversations_status_check" CHECK ("status" IN ('pending', 'solved')),
  CONSTRAINT "support_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
