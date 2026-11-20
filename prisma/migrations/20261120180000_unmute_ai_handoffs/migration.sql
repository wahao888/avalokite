-- AI 判定轉專人不再靜音 LINE 對話，只有站方按「我自己接」才靜音。
-- 解除舊規則留下的靜音（站方手動接手的保留）；只動資料，不改結構。
UPDATE "ChatConversation"
SET "mutedUntil" = NULL
WHERE "mutedUntil" IS NOT NULL
  AND ("handoffReason" IS NULL OR "handoffReason" <> '站方手動接手');
