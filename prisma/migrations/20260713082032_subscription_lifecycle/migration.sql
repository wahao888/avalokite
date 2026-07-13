-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "authLinkSentAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "cancelResult" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "Subscription" ADD COLUMN "startsAt" DATETIME;
