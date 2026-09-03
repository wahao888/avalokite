import { NextResponse, type NextRequest } from "next/server";
import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { tenantFromHost, robotsFor, sitemapFor } from "./lib/tenants";
import { isSuspended, suspendedPage } from "./lib/suspension";
import { SITE } from "./lib/site";

const intlProxy = createProxy(routing);

// ─────────────────────────────────────────────────────────────
// 租戶判定的分工（改動前務必先讀）
//
// 客戶站頁面：由 Host 判定（本檔），<slug>.avalokite.xyz/* → /sites/<slug>/*
// 表單 API  ：由「路徑常數」判定（例如 /api/wenshan/quote 內硬寫 "wenshan"），
//             不看 Host——API 不經過本檔改寫，且 Host 是使用者可控輸入。
// 客戶後台  ：由 Host + cookie 雙重比對（src/lib/tenant-auth.ts），
//             兩者的 slug 不一致一律視為未登入。
// ─────────────────────────────────────────────────────────────

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const tenant = tenantFromHost(req.headers.get("host"));

  if (tenant) {
    // 欠費暫停：整站（含 sitemap 與所有頁面）停止對外服務。
    // /portal 刻意放行——條款保證客戶隨時可匯出自己的資料，把後台一起關掉
    // 就等於用扣留資料當籌碼，那是我們對客戶承諾過不會做的事。
    if (isSuspended(tenant.slug) && !path.startsWith("/portal")) {
      if (path === "/robots.txt") {
        return new NextResponse("User-agent: *\nDisallow: /\n", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "86400" },
        });
      }
      return new NextResponse(suspendedPage(tenant.name, SITE.email), {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "retry-after": "86400",
          "cache-control": "no-store",
        },
      });
    }
    // 逐租戶產生 robots.txt；否則子網域會吃到主站那份
    if (path === "/robots.txt") {
      return new NextResponse(robotsFor(tenant), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    // 同理：不攔的話子網域會拿到主站的 sitemap（滿滿 avalokite.xyz 的網址）。
    // ownSitemap 的租戶例外：讓請求往下走到一般改寫，由站內的 app/sites/<slug>/sitemap.ts
    // 產生（它讀得到 _data 裡的口味與活動，proxy 讀不到也不該讀）。
    if (path === "/sitemap.xml" && !tenant.ownSitemap) {
      const xml = sitemapFor(tenant);
      if (!xml) return new NextResponse("Not Found", { status: 404 });
      return new NextResponse(xml, {
        headers: { "content-type": "application/xml; charset=utf-8" },
      });
    }
    // /portal 是跨租戶共用的後台路由，租戶由 Host + cookie 決定，不可改寫；
    // /api 已被 matcher 排除，這裡再擋一次以防日後 matcher 放寬。
    if (path === "/portal" || path.startsWith("/portal/") || path.startsWith("/api/")) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${tenant.slug}${path === "/" ? "" : path}`;
    return NextResponse.rewrite(url);
  }

  // apex / www / 未登錄子網域：內部實作路徑不可從外面直達，
  // 否則客戶站會有第二個可被索引的網址（重複內容），也洩漏了改寫前的結構。
  if (path.startsWith("/sites/") || path === "/portal" || path.startsWith("/portal/")) {
    // 開發時保留直達，方便不設 hosts 也能看畫面
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  // 主站的 robots.txt / sitemap.xml 交給 app 目錄自己處理（app/robots.ts、
  // app/sitemap.ts），不進 i18n 路由——否則會被導成 /zh-TW/robots.txt
  if (path === "/robots.txt" || path === "/sitemap.xml") return NextResponse.next();

  return intlProxy(req);
}

export const config = {
  matcher: [
    // 排除 api、demo 示範站、Next 內部資源與靜態檔案（admin 走預設語系路由）。
    // 客戶站不再需要排除：它們現在靠 Host 改寫，路徑本身就是 / 開頭的一般路徑。
    "/((?!api|demo|_next|_vercel|.*\\..*).*)",
    // 帶副檔名的路徑被上面排除，但這兩個需要逐租戶產生，單獨列入
    "/robots.txt",
    "/sitemap.xml",
  ],
};
