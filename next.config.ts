import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // 文山木材行原掛在 avalokite.xyz/wenshan（子目錄），已改為 wenshan.avalokite.xyz。
    // 子目錄會讓客戶內容累積到主域，既稀釋 Avalo 自己的主題，也落入 Google 的
    // site reputation abuse（寄生內容）政策範圍；客戶站一律改用子網域。
    // redirects 在 proxy 之前執行，所以 proxy.ts 完全看不到 /wenshan。
    const fromApex = [{ type: "host" as const, value: "(www\\.)?avalokite\\.xyz" }];
    return [
      { source: "/wenshan", has: fromApex, destination: "https://wenshan.avalokite.xyz/", permanent: true },
      { source: "/wenshan/:path*", has: fromApex, destination: "https://wenshan.avalokite.xyz/:path*", permanent: true },
    ];
  },
  async rewrites() {
    // 獨立示範站（public/demo/*）：給客戶看的短網址，不走 i18n、站內也不連結。
    return [{ source: "/demo/glass", destination: "/demo/glass/index.html" }];
  },
  async headers() {
    // 安全標頭統一由 nginx 設（deploy/nginx.conf）——那是最外層，連 502／444 這種
    // 應用程式沒參與的回應也蓋得到；兩邊都設會讓每個回應帶兩份重複標頭。
    return [
      {
        // 頁面 HTML 的快取策略。
        // Next 預設給 SSG 頁面 `s-maxage=31536000`（一年），現在沒 CDN 所以無感，
        // 但一旦前面掛上 CDN，改價／改文案後邊緣節點會繼續發舊頁面長達一年。
        // 這裡改成邊緣只快取 5 分鐘、之後一天內可先發舊的再背景更新。
        // 排除 /api（各自決定）、/_next（雜湊檔名，Next 強制 immutable 且不可覆寫）、
        // /admin 與 /portal（登入後的後台資料，維持 Next 自己給的 no-store——
        // 邊緣快取會把 A 租戶的表單清單發給 B）、以及帶副檔名的靜態檔。
        source: "/((?!api/|_next/|.*\\.)(?!(?:zh-TW|en)/admin)(?!admin)(?!portal).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
