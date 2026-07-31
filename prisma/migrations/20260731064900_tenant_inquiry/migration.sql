-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inquiry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "service" TEXT,
    "budget" TEXT,
    "message" TEXT NOT NULL,
    "payload" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'zh-TW',
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "handledAt" DATETIME,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Inquiry" ("budget", "company", "createdAt", "email", "handled", "id", "locale", "message", "name", "phone", "service") SELECT "budget", "company", "createdAt", "email", "handled", "id", "locale", "message", "name", "phone", "service" FROM "Inquiry";
DROP TABLE "Inquiry";
ALTER TABLE "new_Inquiry" RENAME TO "Inquiry";
CREATE INDEX "Inquiry_tenantId_createdAt_idx" ON "Inquiry"("tenantId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- ─── 以下為手動附加的資料回填（Prisma 不會自己產生）───
-- 多租戶改版前，文山木材行的估價單是靠 service 欄位的字串當來源標記；
-- 現在改由 tenantId 承擔，把既有資料歸戶，否則客戶登入 portal 會看不到自己的歷史單。
UPDATE "Inquiry" SET "tenantId" = 'wenshan' WHERE "service" = '文山木材行報價';
-- service 改為中性的表單名稱（來源已由 tenantId 表達）
UPDATE "Inquiry" SET "service" = '線上估價單' WHERE "service" = '文山木材行報價';
-- 既有已處理的單沒有處理時間，用建立時間補上，避免 portal 顯示空白
UPDATE "Inquiry" SET "handledAt" = "createdAt" WHERE "handled" = true AND "handledAt" IS NULL;
-- 舊資料當年都有寄出通知信，補標記以免 portal 全部顯示「通知信未送達」
UPDATE "Inquiry" SET "notified" = true;
