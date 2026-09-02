-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "note" TEXT,
    "items" TEXT NOT NULL,
    "bundles" TEXT NOT NULL DEFAULT '[]',
    "payment" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "shippingFee" INTEGER NOT NULL,
    "codFee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "remitLast5" TEXT,
    "remitName" TEXT,
    "remitAt" DATETIME,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopOrder" ("address", "codFee", "createdAt", "email", "id", "items", "name", "note", "notified", "payment", "phone", "remitAt", "remitLast5", "remitName", "shippingFee", "status", "subtotal", "tenantId", "total", "updatedAt") SELECT "address", "codFee", "createdAt", "email", "id", "items", "name", "note", "notified", "payment", "phone", "remitAt", "remitLast5", "remitName", "shippingFee", "status", "subtotal", "tenantId", "total", "updatedAt" FROM "ShopOrder";
DROP TABLE "ShopOrder";
ALTER TABLE "new_ShopOrder" RENAME TO "ShopOrder";
CREATE INDEX "ShopOrder_tenantId_createdAt_idx" ON "ShopOrder"("tenantId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
