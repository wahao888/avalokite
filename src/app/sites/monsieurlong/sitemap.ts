import type { MetadataRoute } from "next";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { eventSlugs } from "./_data/events";
import { flavorSlugs } from "./_data/flavors";

/**
 * 本站自己產 sitemap（tenants.ts 的 ownSitemap: true，proxy 因此不代勞）。
 * 口味與活動的路徑住在 _data，把它們拉進每個請求都會跑的 proxy 不划算。
 *
 * 尚未對外時 robots.txt 是 Disallow: /，這裡也回空陣列——
 * 一邊擋索引一邊送 sitemap 等於自打嘴巴。
 */
const TENANT = getTenant("monsieurlong")!;
const ORIGIN = tenantOrigin(TENANT);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!TENANT.indexable) return [];

  const [flavors, events] = await Promise.all([flavorSlugs(), eventSlugs()]);
  const now = new Date();

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${ORIGIN}${path}`,
    lastModified: now,
    changeFrequency: path === "/" || path === "/flavors" ? "daily" : "monthly",
    priority,
  });

  return [
    entry("/", 1),
    entry("/flavors", 0.9),
    entry("/events", 0.7),
    entry("/store", 0.7),
    entry("/collab", 0.6),
    entry("/custom", 0.6),
    ...flavors.map((s) => entry(`/flavors/${s}`, 0.6)),
    ...events.map((s) => entry(`/events/${s}`, 0.5)),
  ];
}
