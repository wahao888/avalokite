-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "note" TEXT,
    "items" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "ShopOrder_tenantId_createdAt_idx" ON "ShopOrder"("tenantId", "createdAt");
