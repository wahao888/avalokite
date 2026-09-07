-- 檔期的識別色。多檔同開時客人要一眼分得出這件屬於哪一趟。
-- nullable → metadata-only ALTER，不重建表。

-- AlterTable
ALTER TABLE "DgBatch" ADD COLUMN "tone" TEXT;

