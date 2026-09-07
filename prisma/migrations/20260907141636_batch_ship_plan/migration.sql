-- 檔期的運費方案。nullable → metadata-only ALTER，不重建表。

-- AlterTable
ALTER TABLE "DgBatch" ADD COLUMN "shipPlan" TEXT;

