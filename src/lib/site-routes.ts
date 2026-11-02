// 主站可被索引的公開路由 — robots.ts 與 sitemap.ts 共用的唯一來源。
//
// 為什麼案例頁從 messages 取而不是寫死一份清單：新增案例本來就一定要在
// messages 加一筆（否則首頁卡片不會出現），從那裡取就不會有「加了案例卻忘了
// 更新 sitemap」的落差。
import type { Metadata } from "next";
import zhTW from "@/messages/zh-TW.json";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";
import { SERVICES, servicePath } from "@/lib/services";

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
  "/subscription", // 客戶自助管理訂閱（網址含交易編號，絕不可被收錄）
];

const LEGAL_DOCS = ["terms", "privacy", "refund"]; // 對應 legal/[doc] 的 DOCS

function casePaths(): string[] {
  const items = (zhTW as { cases?: { items?: { url?: string }[] } }).cases?.items ?? [];
  return items
    .map((i) => i.url)
    .filter((u): u is string => typeof u === "string" && u.startsWith("/cases/"));
}

// 多數頁面的內容來自這幾處：文案、價格
const SHARED_SOURCES = ["src/messages", "src/lib/products.ts"];

/**
 * 公開路由（不含語系前綴）。sitemap 會為每個語系各產一份。
 * priority 是給爬蟲的提示，首頁最高。
 * sources 是組成該頁的原始檔（相對 repo 根目錄），sitemap 用它們最後一次
 * commit 的時間當 lastmod。新頁面的內容放在哪，就要列在這裡。
 */
export function publicPaths(): { path: string; priority: number; sources: string[] }[] {
  return [
    {
      path: "/",
      priority: 1,
      sources: ["src/app/[locale]/page.tsx", "src/components/sections", ...SHARED_SOURCES],
    },
    {
      path: "/pricing",
      priority: 0.9,
      sources: ["src/app/[locale]/pricing", "src/components/sections/Pricing.tsx", "src/components/sections/PromoPlans.tsx", ...SHARED_SOURCES],
    },
    {
      path: "/launch",
      priority: 0.9,
      sources: ["src/app/[locale]/launch", "src/components/sections/PromoPlans.tsx", "src/lib/promo-window.ts", ...SHARED_SOURCES],
    },
    {
      path: "/services",
      priority: 0.8,
      sources: ["src/lib/services.ts", "src/app/[locale]/services"],
    },
    ...SERVICES.map((s) => ({
      path: servicePath(s.slug),
      priority: 0.9,
      sources: ["src/lib/services.ts", "src/app/[locale]/services", ...SHARED_SOURCES],
    })),
    {
      path: "/cases",
      priority: 0.8,
      sources: ["src/app/[locale]/cases", "src/messages"],
    },
    ...casePaths().map((path) => ({
      path,
      priority: 0.8,
      sources: [`src/app/[locale]${path}`],
    })),
    {
      path: "/about",
      priority: 0.7,
      sources: ["src/app/[locale]/about", "src/lib/site.ts"],
    },
    {
      path: "/contact",
      priority: 0.7,
      sources: ["src/app/[locale]/contact", "src/components/ContactForm.tsx"],
    },
    {
      path: "/faq",
      priority: 0.7,
      sources: ["src/lib/faq.ts"],
    },
    {
      path: "/guides",
      priority: 0.7,
      sources: ["src/lib/guides.ts"],
    },
    ...GUIDES.map((g) => ({
      path: `/guides/${g.slug}`,
      priority: 0.7,
      sources: ["src/lib/guides.ts"],
    })),
    ...INDUSTRIES.map((i) => ({
      path: `/industries/${i.slug}`,
      priority: 0.7,
      sources: ["src/lib/industries.ts"],
    })),
    {
      path: "/tools/geo",
      priority: 0.6,
      sources: ["src/app/[locale]/tools/geo"],
    },
    {
      path: "/tools/cost",
      priority: 0.6,
      sources: ["src/app/[locale]/tools/cost", "src/lib/products.ts"],
    },
    {
      path: "/tools/savings",
      priority: 0.6,
      sources: ["src/app/[locale]/tools/savings"],
    },
    {
      path: "/quiz",
      priority: 0.5,
      sources: ["src/app/[locale]/quiz"],
    },
    {
      path: "/referral",
      priority: 0.4,
      sources: ["src/app/[locale]/referral"],
    },
    ...LEGAL_DOCS.map((d) => ({
      path: `/legal/${d}`,
      priority: 0.3,
      sources: ["src/lib/legal-content.ts"],
    })),
  ];
}
