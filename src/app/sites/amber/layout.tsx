import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { SITE, TENANT_SLUG } from "./_data/site";
import { CartProvider } from "./_components/CartProvider";
import { CartButton } from "./_components/CartButton";
import { CartDrawer } from "./_components/CartDrawer";
import { MyOrdersLink } from "./_components/MyOrdersLink";
import { AmberWordmark } from "./_components/Logo";
import "./amber.css";

// 代購站的 root layout（本 repo 第四個：主站 [locale]、其他客戶站、portal、這裡）。
//
// 字體只載**拉丁子集**（約 20KB，next/font 會自我託管、沒有第三方請求）。
// 中文一律走系統字——幾百 KB 的是中文字型，那才是會拖垮 LINE 冷啟動的東西。
// 但價格、倒數、品牌名這些拉丁字與數字是被看最多次的，值得那 20KB。
//
// display: "swap" 讓文字先用系統字畫出來，字體到了再換——
// 客人在 4G 上不該為了字型盯著空白畫面。
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
  variable: "--font-outfit",
});

const tenant = getTenant(TENANT_SLUG)!;

export const metadata: Metadata = {
  metadataBase: new URL(tenantOrigin(tenant)),
  title: { default: SITE.name, template: `%s｜${SITE.name}` },
  description: SITE.tagline,
  // 未對外前不進索引。上線時要跟 tenants.ts 的 indexable 一起翻。
  robots: SITE.indexable ? undefined : { index: false, follow: false },
  // app/ 目錄下的 icon 會產生帶「改寫前內部路徑」的 <link>，會洩漏站台結構，
  // 所以放 public/ 並在這裡明寫（同 REKAT 的做法）。
  icons: { icon: "/sites/amber/icon.svg" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "zh_TW",
    images: ["/sites/amber/og.png"],
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
    <html lang="zh-Hant" className={outfit.variable}>
      <body className="am">
        <CartProvider>
          <header className="am-nav">
            <a className="am-logo" href="/" aria-label={SITE.name}>
              <AmberWordmark />
            </a>
            <nav className="am-nav__links">
              {/* 一個訂單入口就好：下過單的人看到「我的訂單」，
                  沒下過的看到「查訂單」。兩個都放會擠到換行。 */}
              <MyOrdersLink />
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
