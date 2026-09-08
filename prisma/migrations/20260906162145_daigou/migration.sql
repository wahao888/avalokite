-- CreateTable
CREATE TABLE "DgBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "defaultDeadlineAt" DATETIME,
    "defaultEtaAt" DATETIME,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "freeShippingOver" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "imagesPurgedAt" DATETIME,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DgProduct" (
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
    "preorder" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "DgOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" INTEGER,
    "stock" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    CONSTRAINT "DgOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DgProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadId" TEXT,
    "fullPurgedAt" DATETIME,
    "deletedAt" DATETIME,
    "purgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DgImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DgProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "phoneDigits" TEXT,
    "lineUserId" TEXT,
    "lineDisplayName" TEXT,
    "lineId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "note" TEXT,
    "defaultAddressId" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "mergedIntoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DgAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT,
    "recipient" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "cvsBrand" TEXT,
    "cvsStoreId" TEXT,
    "cvsStoreName" TEXT,
    "cvsAddress" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DgAddress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "DgMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "settlementId" TEXT,
    "shipKind" TEXT NOT NULL,
    "shipRecipient" TEXT NOT NULL,
    "shipPhone" TEXT NOT NULL,
    "shipAddress" TEXT,
    "shipCvsBrand" TEXT,
    "shipCvsStoreId" TEXT,
    "shipCvsStoreName" TEXT,
    "shipCvsAddress" TEXT,
    "note" TEXT,
    "itemsTotal" INTEGER NOT NULL,
    "source" TEXT,
    "clientRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DgOrder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DgBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DgOrder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "DgMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DgOrder_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "DgSettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "optionId" TEXT,
    "name" TEXT NOT NULL,
    "optionLabel" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "imageKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "gotQty" INTEGER,
    "statusNote" TEXT,
    "statusAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DgLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DgOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DgLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DgProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DgLine_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "DgOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'open',
    "grossAmount" INTEGER NOT NULL DEFAULT 0,
    "deductAmount" INTEGER NOT NULL DEFAULT 0,
    "adjustAmount" INTEGER NOT NULL DEFAULT 0,
    "adjustNote" TEXT,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "creditApplied" INTEGER NOT NULL DEFAULT 0,
    "payableAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "payment" TEXT,
    "remitLast5" TEXT,
    "remitName" TEXT,
    "remitAt" DATETIME,
    "lookupToken" TEXT NOT NULL,
    "etaAt" DATETIME,
    "shipNo" TEXT,
    "closedAt" DATETIME,
    "paidAt" DATETIME,
    "shippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DgSettlement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "DgMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DgSettlement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DgBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DgLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "settlementId" TEXT,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "last5" TEXT,
    "payerName" TEXT,
    "note" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DgLedger_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "DgMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DgLedger_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "DgSettlement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DgBatch_tenantId_status_openAt_idx" ON "DgBatch"("tenantId", "status", "openAt");

-- CreateIndex
CREATE UNIQUE INDEX "DgBatch_tenantId_slug_key" ON "DgBatch"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "DgProduct_tenantId_batchId_status_sortOrder_idx" ON "DgProduct"("tenantId", "batchId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "DgProduct_tenantId_deadlineAt_idx" ON "DgProduct"("tenantId", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "DgProduct_tenantId_slug_key" ON "DgProduct"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "DgProduct_tenantId_clientRef_key" ON "DgProduct"("tenantId", "clientRef");

-- CreateIndex
CREATE INDEX "DgOption_tenantId_productId_sortOrder_idx" ON "DgOption"("tenantId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "DgImage_tenantId_productId_sortOrder_idx" ON "DgImage"("tenantId", "productId", "sortOrder");

-- CreateIndex
CREATE INDEX "DgImage_tenantId_purgedAt_deletedAt_idx" ON "DgImage"("tenantId", "purgedAt", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DgImage_tenantId_uploadId_key" ON "DgImage"("tenantId", "uploadId");

-- CreateIndex
CREATE INDEX "DgMember_tenantId_createdAt_idx" ON "DgMember"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DgMember_tenantId_phoneDigits_key" ON "DgMember"("tenantId", "phoneDigits");

-- CreateIndex
CREATE UNIQUE INDEX "DgMember_tenantId_lineUserId_key" ON "DgMember"("tenantId", "lineUserId");

-- CreateIndex
CREATE INDEX "DgAddress_tenantId_memberId_idx" ON "DgAddress"("tenantId", "memberId");

-- CreateIndex
CREATE INDEX "DgOrder_tenantId_batchId_createdAt_idx" ON "DgOrder"("tenantId", "batchId", "createdAt");

-- CreateIndex
CREATE INDEX "DgOrder_tenantId_memberId_createdAt_idx" ON "DgOrder"("tenantId", "memberId", "createdAt");

-- CreateIndex
CREATE INDEX "DgOrder_tenantId_settlementId_idx" ON "DgOrder"("tenantId", "settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "DgOrder_tenantId_clientRef_key" ON "DgOrder"("tenantId", "clientRef");

-- CreateIndex
CREATE INDEX "DgLine_tenantId_orderId_idx" ON "DgLine"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "DgLine_tenantId_productId_status_idx" ON "DgLine"("tenantId", "productId", "status");

-- CreateIndex
CREATE INDEX "DgSettlement_tenantId_status_createdAt_idx" ON "DgSettlement"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DgSettlement_tenantId_memberId_idx" ON "DgSettlement"("tenantId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "DgSettlement_tenantId_memberId_batchId_seq_key" ON "DgSettlement"("tenantId", "memberId", "batchId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "DgSettlement_tenantId_lookupToken_key" ON "DgSettlement"("tenantId", "lookupToken");

-- CreateIndex
CREATE INDEX "DgLedger_tenantId_settlementId_idx" ON "DgLedger"("tenantId", "settlementId");

-- CreateIndex
CREATE INDEX "DgLedger_tenantId_memberId_at_idx" ON "DgLedger"("tenantId", "memberId", "at");
