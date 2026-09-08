import type { MetadataRoute } from "next";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { SITE, TENANT_SLUG } from "./_data/site";

// 站內自產 sitemap（Tenant.ownSitemap = true，所以 proxy 不代為產生）。
//
// ⚠ 刻意**不列商品頁**。連線商品幾天後就截止、檔期一過就下架，
// 收錄它們只會替搜尋引擎累積死連結，也會讓客人從搜尋點進來看到「已截止」。
// 這一站真正的入口是 LINE 群組裡的連結，不是搜尋。
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE.indexable) return [];
  const origin = tenantOrigin(getTenant(TENANT_SLUG)!);
  return [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    // 說明頁相反：它們幾乎不變、內容穩定，而且是搜尋「代購 怎麼買」
    // 這類問題時真正有用的落點。
    { url: `${origin}/lineups`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${origin}/how`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/order/lookup`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
