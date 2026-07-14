-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "merchantTradeNo" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "monthlyAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startsAt" DATETIME,
    "authLinkSentAt" DATETIME,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "totalSuccessTimes" INTEGER NOT NULL DEFAULT 0,
    "lastChargeAt" DATETIME,
    "gwsr" TEXT,
    "cancelledAt" DATETIME,
    "cancelResult" TEXT,
    "rawReturn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("authLinkSentAt", "cancelResult", "cancelledAt", "createdAt", "gwsr", "id", "lastChargeAt", "merchantTradeNo", "monthlyAmount", "orderId", "rawReturn", "sku", "startsAt", "status", "totalSuccessTimes", "updatedAt") SELECT "authLinkSentAt", "cancelResult", "cancelledAt", "createdAt", "gwsr", "id", "lastChargeAt", "merchantTradeNo", "monthlyAmount", "orderId", "rawReturn", "sku", "startsAt", "status", "totalSuccessTimes", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_merchantTradeNo_key" ON "Subscription"("merchantTradeNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
