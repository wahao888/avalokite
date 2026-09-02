import type { MetadataRoute } from "next";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { beanSlugs } from "./_data/beans";

/**
 * 本站自己產 sitemap（tenants.ts 的 ownSitemap: true，proxy 因此不代勞）。
 * 每一支豆子都有自己的單品頁，把這份清單拉進每個請求都會跑的 proxy 不划算。
 *
 * 尚未對外時 robots.txt 是 Disallow: /，這裡也回空陣列——
 * 一邊擋索引一邊送 sitemap 等於自打嘴巴。
 * 購物車、結帳、訂單查詢不收錄：沒有可索引的內容，且每個人看到的都不一樣。
 */
const TENANT = getTenant("rekat")!;
const ORIGIN = tenantOrigin(TENANT);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!TENANT.indexable) return [];

  const now = new Date();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${ORIGIN}${path}`,
    lastModified: now,
    changeFrequency: path === "/beans" ? "weekly" : "monthly",
    priority,
  });

  return [
    entry("/", 1),
    entry("/beans", 0.95),
    entry("/craft", 0.8),
    entry("/brewing", 0.75),
    entry("/about", 0.7),
    ...beanSlugs().map((s) => entry(`/beans/${s}`, 0.65)),
  ];
}
