-- 商品的「允許預購」預設改為 true。
--
-- 代購本來就是預購制：客人先訂、她才去採買。客戶的出貨說明也寫明
-- 「採預購制，下單付款後才會安排採買」，預設關閉等於每一件都要她手動打開。
--
-- ⚠ SQLite 改非空欄位的預設值會整表重建（RedefineTables）。
-- 刻意趁站還沒上線、沒有正式資料時做——之後再改就是在有真實資料的表上重建。
-- 這也是 schema 註解裡「日後加欄位一律 nullable」那條規則的反面教材。

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DgProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryKey" TEXT,
    "note" TEXT,
    "price" INTEGER NOT NULL,
    "optionAxis" TEXT,
    "deadlineAt" DATETIME,
    "preorder" BOOLEAN NOT NULL DEFAULT true,
    "showStock" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER,
    "clientRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DgProduct_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DgBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DgProduct" ("batchId", "categoryKey", "clientRef", "createdAt", "deadlineAt", "deletedAt", "id", "name", "note", "optionAxis", "preorder", "price", "showStock", "slug", "sortOrder", "status", "stock", "tenantId", "updatedAt") SELECT "batchId", "categoryKey", "clientRef", "createdAt", "deadlineAt", "deletedAt", "id", "name", "note", "optionAxis", "preorder", "price", "showStock", "slug", "sortOrder", "status", "stock", "tenantId", "updatedAt" FROM "DgProduct";
DROP TABLE "DgProduct";
ALTER TABLE "new_DgProduct" RENAME TO "DgProduct";
CREATE INDEX "DgProduct_tenantId_batchId_status_sortOrder_idx" ON "DgProduct"("tenantId", "batchId", "status", "sortOrder");
CREATE INDEX "DgProduct_tenantId_deadlineAt_idx" ON "DgProduct"("tenantId", "deadlineAt");
CREATE UNIQUE INDEX "DgProduct_tenantId_slug_key" ON "DgProduct"("tenantId", "slug");
CREATE UNIQUE INDEX "DgProduct_tenantId_clientRef_key" ON "DgProduct"("tenantId", "clientRef");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

