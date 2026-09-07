-- 會員的「我的訂單」分享連結 token。
--
-- nullable：既有會員懶生成（第一次需要時才產），而且 SQLite 對可為 null
-- 的欄位是 metadata-only 的 ALTER，不重建整張表——這正是 schema 註解裡
-- 「日後加欄位一律 nullable」那條規則的實例。

-- AlterTable
ALTER TABLE "DgMember" ADD COLUMN "lookupToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DgMember_tenantId_lookupToken_key" ON "DgMember"("tenantId", "lookupToken");

