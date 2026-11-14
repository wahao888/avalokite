ALTER TABLE "Order" ADD COLUMN "adsMeasurementAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "adsOppref" TEXT;
ALTER TABLE "Order" ADD COLUMN "adsObref" TEXT;

CREATE TABLE "AdsConversion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payload" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" DATETIME,
  "lastError" TEXT
);
CREATE INDEX "AdsConversion_sentAt_nextAttemptAt_idx" ON "AdsConversion"("sentAt", "nextAttemptAt");
