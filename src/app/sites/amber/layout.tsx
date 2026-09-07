import type { Metadata } from "next";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { SITE, TENANT_SLUG } from "./_data/site";
import { CartProvider } from "./_components/CartProvider";
import { CartButton } from "./_components/CartButton";
import { CartDrawer } from "./_components/CartDrawer";
import { MyOrdersLink } from "./_components/MyOrdersLink";
import "./amber.css";

// 代購站的 root layout（本 repo 第四個：主站 [locale]、其他客戶站、portal、這裡）。
//
// 刻意不載入任何 web font。客人幾乎都是從 LINE 點連結進來的——那是行動網路、
// 而且 LINE 的內建瀏覽器每次都是冷啟動。一份中文 web font 動輒數百 KB，
// 會直接吃掉「連線商品要能立刻看到」這件事。系統字堆疊在手機上本來就好看。

const tenant = getTenant(TENANT_SLUG)!;

export const metadata: Metadata = {
  metadataBase: new URL(tenantOrigin(tenant)),
  title: { default: SITE.name, template: `%s｜${SITE.name}` },
  description: SITE.tagline,
  // 未對外前不進索引。上線時要跟 tenants.ts 的 indexable 一起翻。
  robots: SITE.indexable ? undefined : { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "zh_TW",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // 商品照要能捏放大看細節（代購客人很在意實品長怎樣），所以不鎖縮放
  maximumScale: 5,
};

export default function AmberLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="am">
        <CartProvider>
          <header className="am-nav">
            <a className="am-nav__brand" href="/">
              {SITE.shortName}
            </a>
            <nav className="am-nav__links">
              {/* 下過單的人才會看到——連結存在他自己的裝置上 */}
              <MyOrdersLink />
              <a href="/order/lookup">查訂單</a>
              <CartButton />
            </nav>
          </header>

          <main>{children}</main>

          <footer className="am-foot">
            <p>{SITE.name}</p>
            <p className="am-foot__links">
              <a href="/order/lookup">查訂單</a>
              {SITE.lineAddUrl ? <a href={SITE.lineAddUrl}>LINE 客服 {SITE.lineId}</a> : null}
            </p>
          </footer>

          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
