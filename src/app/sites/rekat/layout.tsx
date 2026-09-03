import type { Metadata } from "next";
import { Jost, DM_Mono } from "next/font/google";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { INDEXABLE, SITE } from "./_data/site";
import { CartProvider } from "./_components/CartProvider";
import CartDrawer from "./_components/CartDrawer";
import RkNav from "./_components/RkNav";
import RkFooter from "./_components/RkFooter";
import "./rekat.css";

// 拉丁大字。Jost 是幾何無襯線，字腔開、重心穩——日系咖啡包裝上最常見的骨架。
// 只用 300／400 兩個字重：這個站的層級靠尺寸與字距分，不靠粗細。
const display = Jost({
  variable: "--rk-font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

// 標籤、溫度、克數、價格。等寬字讓數字看起來像儀器讀數而不是廣告。
const mono = DM_Mono({
  variable: "--rk-font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

// 中文不走 next/font——CJK 會被切成上百段 unicode-range，產生半 MB 的
// @font-face CSS 擋在首次繪製前面。改用系統字堆疊（見 rekat.css 的 --rk-han）。

// 本站的 origin 由租戶登錄表決定，不能沿用 NEXT_PUBLIC_SITE_URL（那是 Avalo 主站）。
const ORIGIN = tenantOrigin(getTenant("rekat")!);

const DESCRIPTION =
  "REKAT ROASTERY 日卡地自然農莊，台東鹿野的自家烘焙咖啡。烘豆師王龍三十年資歷，以淺焙為主，選用夏威夷可娜、巴拿馬藝伎、牙買加藍山、蘇門答臘曼特寧等高階生豆。線上訂購半磅裝原豆，三包另有優惠。";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  // favicon 放 public/ 而非 app/ 內：app/ 內的 icon.svg 會產生帶內部路徑
  // （/sites/rekat/icon.svg）的 <link>，把改寫前的實作路徑洩進 HTML。
  icons: { icon: "/sites/rekat/icon.svg" },
  title: {
    default: "REKAT ROASTERY 日卡地自然農莊｜台東鹿野・自家烘焙精品咖啡豆",
    template: "%s｜REKAT ROASTERY",
  },
  description: DESCRIPTION,
  keywords: [
    "REKAT ROASTERY",
    "日卡地自然農莊",
    "自家烘焙咖啡豆",
    "精品咖啡豆",
    "藝伎咖啡",
    "翡翠莊園",
    "藍山咖啡",
    "厭氧發酵咖啡",
    "淺焙咖啡豆",
    "台東 咖啡",
    "咖啡豆 宅配",
  ],
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "REKAT ROASTERY 日卡地自然農莊",
    description: "三十年烘豆，只停在一爆之後、二爆之前。台東鹿野自家烘焙精品咖啡豆。",
    type: "website",
    locale: "zh_TW",
    siteName: SITE.name,
    url: ORIGIN,
    images: [{ url: "/sites/rekat/og.png", width: 1200, height: 630, alt: SITE.nameFull }],
  },
  twitter: {
    card: "summary_large_image",
    title: "REKAT ROASTERY 日卡地自然農莊",
    description: "三十年烘豆，只停在一爆之後、二爆之前。",
    images: ["/sites/rekat/og.png"],
  },
};

// schema.org 用 Store：這是一家把豆子賣出去的烘豆坊，不是供人內用的咖啡館，
// 用 CafeOrCoffeeShop 會誤導搜尋引擎與使用者。
// 刻意不放 aggregateRating——沒有經過驗證的評分自己宣告等於自誇。
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${ORIGIN}/#store`,
  name: SITE.name,
  alternateName: [SITE.nameZh, SITE.nameFull],
  description: DESCRIPTION,
  slogan: SITE.tagline,
  url: ORIGIN,
  image: `${ORIGIN}/sites/rekat/og.png`,
  telephone: SITE.phoneTel,
  address: {
    "@type": "PostalAddress",
    postalCode: SITE.address.postalCode,
    addressRegion: SITE.address.region,
    addressLocality: SITE.address.locality,
    streetAddress: SITE.address.street,
    addressCountry: "TW",
  },
  sameAs: [SITE.facebook, SITE.blog],
  founder: { "@type": "Person", name: SITE.roaster.name, jobTitle: SITE.roaster.title },
  makesOffer: {
    "@type": "Offer",
    itemOffered: { "@type": "Product", name: "自家烘焙精品咖啡豆", category: "Coffee Beans" },
    priceCurrency: "TWD",
  },
};

export default function RekatLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${display.variable} ${mono.variable}`}>
      <body className="rk">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* .rk-reveal 的初始狀態是 opacity: 0，靠 IntersectionObserver 打開。
            JS 沒跑起來時整頁會是空白的——這裡兜底。 */}
        <noscript>
          <style>{`.rk .rk-reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <a className="rk-skip" href="#main">
          跳到主要內容
        </a>
        <CartProvider>
          <RkNav />
          <main id="main">{children}</main>
          <RkFooter />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
