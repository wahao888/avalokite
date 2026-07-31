import { NextResponse, type NextRequest } from "next/server";
import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { tenantFromHost, robotsFor } from "./lib/tenants";

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
    // 逐租戶產生 robots.txt；否則子網域會吃到主站那份
    if (path === "/robots.txt") {
      return new NextResponse(robotsFor(tenant), {
        headers: { "content-type": "text/plain; charset=utf-8" },
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

  // 主站的 robots.txt 交給 app 目錄自己處理，不進 i18n 路由
  if (path === "/robots.txt") return NextResponse.next();

  return intlProxy(req);
}

export const config = {
  matcher: [
    // 排除 api、demo 示範站、Next 內部資源與靜態檔案（admin 走預設語系路由）。
    // 客戶站不再需要排除：它們現在靠 Host 改寫，路徑本身就是 / 開頭的一般路徑。
    "/((?!api|demo|_next|_vercel|.*\\..*).*)",
    // 帶副檔名的路徑被上面排除，但 robots.txt 需要逐租戶產生，單獨列入
    "/robots.txt",
  ],
};
