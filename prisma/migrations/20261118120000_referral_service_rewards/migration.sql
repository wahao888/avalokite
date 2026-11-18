-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CareReward" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referralId" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    "service" TEXT,
    "note" TEXT,
    CONSTRAINT "CareReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CareReward" ("createdAt", "email", "id", "redeemedAt", "referralId", "side") SELECT "createdAt", "email", "id", "redeemedAt", "referralId", "side" FROM "CareReward";
DROP TABLE "CareReward";
ALTER TABLE "new_CareReward" RENAME TO "CareReward";
CREATE INDEX "CareReward_email_redeemedAt_idx" ON "CareReward"("email", "redeemedAt");
CREATE UNIQUE INDEX "CareReward_referralId_side_key" ON "CareReward"("referralId", "side");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

