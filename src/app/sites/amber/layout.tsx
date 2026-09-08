import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { SITE, TENANT_SLUG } from "./_data/site";
import { FOOT_HELP, FOOT_SHOP } from "./_data/nav";
import { CartProvider } from "./_components/CartProvider";
import { CartButton } from "./_components/CartButton";
import { CartDrawer } from "./_components/CartDrawer";
import { MyOrdersLink } from "./_components/MyOrdersLink";
import { SiteNav } from "./_components/SiteNav";
import { ThemeToggle, THEME_BOOT } from "./_components/ThemeToggle";
import { AmberWordmark, AmberMark } from "./_components/Logo";
import { IconChat, IconChevronRight } from "./_components/Icons";
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
  const year = new Date().getFullYear();

  // suppressHydrationWarning 只作用在 <html> 這一個元素上，不會往下傳染。
  // 它是必要的：THEME_BOOT 在 React 之前就把 data-theme 寫上去了，
  // 而伺服器不可能知道這台裝置存了什麼偏好——這個「不一致」正是預期行為。
  return (
    <html lang="zh-Hant" className={outfit.variable} suppressHydrationWarning>
      <head>
        {/* ⚠ 必須是 <head> 裡的同步腳本，而且必須排在樣式表之前生效。
            任何非同步的做法都會先畫出淺色再跳成深色，那一下白閃
            在深色模式下特別刺眼。內容見 ThemeToggle.tsx 的 THEME_BOOT。 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="am">
        <CartProvider>
          <header className="am-nav">
            <div className="am-nav__inner">
              <a className="am-logo" href="/" aria-label={SITE.name}>
                <AmberWordmark />
              </a>

              <SiteNav />

              <nav className="am-nav__links" aria-label="帳戶與購物車">
                {/* 一個訂單入口就好：下過單的人看到「我的訂單」，
                    沒下過的看到「查訂單」。兩個都放會擠到換行。 */}
                <MyOrdersLink />
                <ThemeToggle />
                <CartButton />
              </nav>
            </div>
          </header>

          <main>{children}</main>

          <footer className="am-foot">
            <div className="am-foot__inner">
              <div className="am-foot__grid">
                <div className="am-foot__brand">
                  <a className="am-logo" href="/" aria-label={SITE.name}>
                    <AmberWordmark />
                  </a>
                  <p>
                    {SITE.tagline}。各國品牌官網與門市正品代購，
                    採預購制，商品抵台後檢查再寄出。
                  </p>
                </div>

                <div>
                  <h3>選購</h3>
                  <ul>
                    {FOOT_SHOP.map((l) => (
                      <li key={l.href}>
                        <a href={l.href}>{l.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3>說明</h3>
                  <ul>
                    {FOOT_HELP.map((l) => (
                      <li key={l.href}>
                        <a href={l.href}>{l.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3>聯絡</h3>
                  <ul>
                    {SITE.lineAddUrl ? (
                      <li>
                        <a href={SITE.lineAddUrl}>
                          <IconChat size={16} stroke={1.7} />
                          LINE {SITE.lineId}
                        </a>
                      </li>
                    ) : null}
                    <li>
                      <a href="/about">
                        <IconChevronRight size={16} stroke={1.7} />
                        關於 {SITE.name}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="am-foot__bar">
                <span>
                  <AmberMark size={14} stroke={2} /> © {year} {SITE.name}
                </span>
                <span>本站商品皆為代購，下單前請詳閱購買規範。</span>
              </div>
            </div>
          </footer>

          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
