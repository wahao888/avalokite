import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { PRIVATE_PATHS } from "@/lib/site-routes";

// 主站 robots.txt。
// 客戶子網域「不會」走到這裡——proxy.ts 認出租戶 Host 後會直接回 robotsFor(tenant)，
// 否則子網域會吃到主站這份、把客戶站的 noindex 設定蓋掉。
export default function robots(): MetadataRoute.Robots {
  const privateRule = {
    allow: "/",
    // 後台與購物流程進搜尋結果沒有意義，只會浪費爬蟲配額
    // （頁面本身另有 noindex，這裡是第二道；robots 擋的是「爬」，noindex 擋的是「收錄」）
    disallow: PRIVATE_PATHS,
  };
  // 明確放行 AI 爬蟲，避免被誤讀成「沒寫 = 不歡迎」。
  //
  // ⚠ 每一組都要帶上同一份 disallow。robots.txt 的比對規則是「挑最符合的那一組，
  // 其餘整個不看」，不是把 * 的規則疊加上去——具名群組只寫 allow 的話，
  // 等於單獨對這幾隻爬蟲開放後台、購物流程，以及網址帶交易編號的訂閱管理頁。
  const named = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "Google-Extended",
    "PerplexityBot",
    "ClaudeBot",
    "Bingbot",
  ];
  return {
    rules: [
      { userAgent: "*", ...privateRule },
      ...named.map((userAgent) => ({ userAgent, ...privateRule })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
