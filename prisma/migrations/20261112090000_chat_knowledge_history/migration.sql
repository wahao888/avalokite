-- 知識庫的歷史版本。手寫而不是 prisma migrate dev：這個工作目錄常常有別的
-- session 未提交的 schema 改動，migrate dev 會把人家的變更一起包進這支遷移。
CREATE TABLE "ChatKnowledgeVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ChatKnowledgeVersion_tenantId_createdAt_idx" ON "ChatKnowledgeVersion"("tenantId", "createdAt");
