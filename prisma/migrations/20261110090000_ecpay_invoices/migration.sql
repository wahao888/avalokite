ALTER TABLE "Order" ADD COLUMN "invoiceAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoiceCarrier" TEXT;

CREATE TABLE "Invoice" (
    "reference" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNo" TEXT,
    "invoiceDate" TEXT,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Invoice_environment_status_nextAttemptAt_idx" ON "Invoice"("environment", "status", "nextAttemptAt");
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
