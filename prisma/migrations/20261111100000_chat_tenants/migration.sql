-- AI 客服加上租戶維度。
--
-- tenantId 給非 null 的預設值，既有列自動回填成 "avalo"：主站現在在跑的客服
-- 不會有任何行為改變。SQLite 對「加一個有常數預設值的欄位」是 metadata-only，
-- 不會重建整張表。
ALTER TABLE "ChatConversation" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'avalo';

-- 唯一鍵要把租戶算進去，否則兩個客戶站的同一個 LINE userId 會互相蓋掉對話。
DROP INDEX "ChatConversation_channel_externalId_key";
CREATE UNIQUE INDEX "ChatConversation_tenantId_channel_externalId_key"
  ON "ChatConversation"("tenantId", "channel", "externalId");

-- 後台列表一律以租戶過濾，索引跟著換
DROP INDEX "ChatConversation_lastAt_idx";
CREATE INDEX "ChatConversation_tenantId_lastAt_idx"
  ON "ChatConversation"("tenantId", "lastAt");

-- 客戶站的知識庫。主站不用，它的知識庫是程式算出來的。
CREATE TABLE "ChatKnowledge" (
    "tenantId" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
