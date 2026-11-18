ALTER TABLE "Order" ADD COLUMN "referralCode" TEXT;

CREATE TABLE "ReferralCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ReferralCode_email_key" ON "ReferralCode"("email");

CREATE TABLE "Referral" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Referral_code_fkey" FOREIGN KEY ("code") REFERENCES "ReferralCode" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Referral_orderId_key" ON "Referral"("orderId");
CREATE UNIQUE INDEX "Referral_email_key" ON "Referral"("email");
CREATE UNIQUE INDEX "Referral_phone_key" ON "Referral"("phone");

CREATE TABLE "CareReward" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "referralId" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    "merchantTradeNo" TEXT,
    "freeFrom" DATETIME,
    "freeUntil" DATETIME,
    "billingReference" TEXT,
    CONSTRAINT "CareReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CareReward_email_redeemedAt_idx" ON "CareReward"("email", "redeemedAt");
CREATE UNIQUE INDEX "CareReward_referralId_side_key" ON "CareReward"("referralId", "side");
