-- CreateTable
CREATE TABLE "LineWebhookEvent" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "LineWebhookEvent_createdAt_idx" ON "LineWebhookEvent"("createdAt");
