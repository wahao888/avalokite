import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { PRIVATE_PATHS } from "@/lib/site-routes";

// 主站 robots.txt。
// 客戶子網域「不會」走到這裡——proxy.ts 認出租戶 Host 後會直接回 robotsFor(tenant)，
// 否則子網域會吃到主站這份、把客戶站的 noindex 設定蓋掉。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 後台與購物流程進搜尋結果沒有意義，只會浪費爬蟲配額
      // （頁面本身另有 noindex，這裡是第二道；robots 擋的是「爬」，noindex 擋的是「收錄」）
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
