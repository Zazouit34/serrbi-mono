CREATE TABLE "AiChatUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dayBucket" TIMESTAMP(3) NOT NULL,
  "requests" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiChatUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiChatUsage_userId_dayBucket_key" ON "AiChatUsage"("userId", "dayBucket");
CREATE INDEX "AiChatUsage_userId_idx" ON "AiChatUsage"("userId");
CREATE INDEX "AiChatUsage_dayBucket_idx" ON "AiChatUsage"("dayBucket");

ALTER TABLE "AiChatUsage"
ADD CONSTRAINT "AiChatUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
