import { prisma } from "./prisma";

// ─────────────────────────────────────────────────────────────
// 客戶後台唯一允許碰 Prisma 的檔案。tests/tenant-isolation.test.ts 會掃原始碼
// 強制執行以下規則，改動前請一併看那支測試：
//
// ① 每個 export function 的第一個參數都是 tenantId
// ② 每個 prisma 呼叫的 where 都必須含 tenantId
// ③ 禁用 findUnique / update / delete
//
// ③ 是本檔最重要的一條：prisma.inquiry.update({ where: { id } }) 的 where
// 只接受唯一鍵，型別上塞不進 tenantId。若改成「先 findFirst 驗證再 update」，
// 就多了一個「有人忘了先驗證」的破口。改用 updateMany 把租戶條件放進 WHERE，
// 讓「漏掉 scope」在型別層面就寫不出來，回傳的 count 同時就是授權檢查結果。
// ─────────────────────────────────────────────────────────────

export const PAGE_SIZE = 50;

export function listInquiries(
  tenantId: string,
  opts?: { skip?: number; take?: number; onlyUnhandled?: boolean },
) {
  return prisma.inquiry.findMany({
    where: { tenantId, ...(opts?.onlyUnhandled ? { handled: false } : {}) },
    orderBy: { createdAt: "desc" },
    skip: opts?.skip ?? 0,
    take: opts?.take ?? PAGE_SIZE,
  });
}

export function countInquiries(tenantId: string, opts?: { onlyUnhandled?: boolean }) {
  return prisma.inquiry.count({
    where: { tenantId, ...(opts?.onlyUnhandled ? { handled: false } : {}) },
  });
}

export function getInquiry(tenantId: string, id: number) {
  return prisma.inquiry.findFirst({ where: { id, tenantId } });
}

/** @returns 是否確實更新到本租戶的一筆（false = 該 id 不屬於此租戶，等同未授權） */
export async function setHandled(tenantId: string, id: number, handled: boolean) {
  const r = await prisma.inquiry.updateMany({
    where: { id, tenantId },
    data: { handled, handledAt: handled ? new Date() : null },
  });
  return r.count === 1;
}

export function allInquiriesForExport(tenantId: string) {
  return prisma.inquiry.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}
