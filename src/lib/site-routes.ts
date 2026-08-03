// 主站可被索引的公開路由 — robots.ts 與 sitemap.ts 共用的唯一來源。
//
// 為什麼案例頁從 messages 取而不是寫死一份清單：新增案例本來就一定要在
// messages 加一筆（否則首頁卡片不會出現），從那裡取就不會有「加了案例卻忘了
// 更新 sitemap」的落差。
import type { Metadata } from "next";
import zhTW from "@/messages/zh-TW.json";

/**
 * 工具頁共用的 noindex。robots.txt 擋的是「爬」、這個擋的是「收錄」——
 * 兩者都要：被外部連結指到的頁面即使沒被爬也可能出現在搜尋結果。
 *
 * cart / checkout / order/lookup 是 client component，不能直接匯出 metadata，
 * 所以那幾個掛在各自的 layout.tsx 上。
 */
export const NOINDEX: Metadata = { robots: { index: false, follow: false } };

/** 不該進搜尋結果的工具頁：後台、購物流程、訂單查詢。與 NOINDEX_PAGES 對應 */
export const PRIVATE_PATHS = [
  "/admin",
  "/cart",
  "/checkout",
  "/order/lookup",
  "/order/result",
];

const LEGAL_DOCS = ["terms", "privacy", "refund"]; // 對應 legal/[doc] 的 DOCS

function casePaths(): string[] {
  const items = (zhTW as { cases?: { items?: { url?: string }[] } }).cases?.items ?? [];
  return items
    .map((i) => i.url)
    .filter((u): u is string => typeof u === "string" && u.startsWith("/cases/"));
}

/**
 * 公開路由（不含語系前綴）。sitemap 會為每個語系各產一份。
 * changeFrequency/priority 是給爬蟲的提示，首頁最高。
 */
export function publicPaths(): { path: string; priority: number }[] {
  return [
    { path: "/", priority: 1 },
    ...casePaths().map((path) => ({ path, priority: 0.8 })),
    ...LEGAL_DOCS.map((d) => ({ path: `/legal/${d}`, priority: 0.3 })),
  ];
}
