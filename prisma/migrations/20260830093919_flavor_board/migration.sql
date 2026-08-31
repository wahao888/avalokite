-- CreateTable
CREATE TABLE "FlavorBoard" (
    "tenantId" TEXT NOT NULL PRIMARY KEY,
    "slugs" TEXT NOT NULL DEFAULT '[]',
    "extras" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL
);
