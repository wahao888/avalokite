-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "commitEndsAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "escalatedAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "previousMtn" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "termMonths" INTEGER;
