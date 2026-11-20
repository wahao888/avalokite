-- 訂單記錄是否由 AI 客服的連結帶來（nullable：SQLite 加欄位不需重建表）
ALTER TABLE "Order" ADD COLUMN "chatRef" TEXT;
