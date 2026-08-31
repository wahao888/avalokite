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

// ── 今日供應看板（Tenant.flavorBoard 的租戶才用得到）─────────────
// 一個租戶一列，主鍵就是 tenantId，所以 where 天生帶租戶範圍。

export type BoardRow = {
  slugs: string[];
  extras: string[];
  note: string | null;
  updatedAt: Date | null;
};

/** JSON 欄位解析失敗一律當空陣列——看板壞掉不該讓整個首頁 500 */
function parseList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function getFlavorBoard(tenantId: string): Promise<BoardRow> {
  const row = await prisma.flavorBoard.findFirst({ where: { tenantId } });
  if (!row) return { slugs: [], extras: [], note: null, updatedAt: null };
  return {
    slugs: parseList(row.slugs),
    extras: parseList(row.extras),
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

export async function saveFlavorBoard(
  tenantId: string,
  data: { slugs: string[]; extras: string[]; note: string | null },
) {
  const payload = {
    slugs: JSON.stringify(data.slugs),
    extras: JSON.stringify(data.extras),
    note: data.note,
  };
  await prisma.flavorBoard.upsert({
    where: { tenantId },
    create: { tenantId, ...payload },
    update: payload,
  });
}
