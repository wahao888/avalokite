-- CreateTable
CREATE TABLE "BeanStock" (
    "tenantId" TEXT NOT NULL PRIMARY KEY,
    "soldOut" TEXT NOT NULL DEFAULT '[]',
    "hidden" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL
);
