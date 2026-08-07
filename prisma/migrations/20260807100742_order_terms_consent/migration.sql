-- AlterTable
ALTER TABLE "Order" ADD COLUMN "agreedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "agreedIp" TEXT;
ALTER TABLE "Order" ADD COLUMN "agreedTermsHash" TEXT;
ALTER TABLE "Order" ADD COLUMN "agreedTermsVersion" TEXT;
