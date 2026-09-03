import "server-only";
import { getBeanStock } from "@/lib/tenant-data";
import { listBeans, type Bean } from "./beans";

/**
 * 本期供應狀態。只在伺服器端讀，結果以 props 傳給前台元件——
 * 客戶端不需要（也不應該）自己查資料庫。
 *
 * 讀這個的頁面一律要 `export const dynamic = "force-dynamic"`：
 * 部署是「在本機 build 再把產物送上去」，預先產生的話 HTML 裡會包住開發機
 * dev.db 的狀態，rsync 上去就成了初始快取，店家改過的上下架會在部署後倒退。
 * （Monsieur Long 的今日供應板 2026-08-31 實際踩過。）
 */
export type Stock = {
  soldOut: Set<string>;
  hidden: Set<string>;
  note: string | null;
  updatedAt: Date | null;
};

export async function getStock(): Promise<Stock> {
  const row = await getBeanStock("rekat");
  return {
    soldOut: new Set(row.soldOut),
    hidden: new Set(row.hidden),
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

/** 前台看得到的豆子：下架的直接不出現，售完的仍列出但不能下單 */
export function visibleBeans(stock: Stock): Bean[] {
  return listBeans().filter((b) => !stock.hidden.has(b.slug));
}

/** 傳給客戶端元件的最小形狀（Set 不能跨 server→client 邊界序列化） */
export const stockProps = (stock: Stock) => ({
  soldOut: [...stock.soldOut],
  hidden: [...stock.hidden],
});
