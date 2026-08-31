import type { Metadata } from "next";
import { Instrument_Serif, DM_Mono } from "next/font/google";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import { HOURS, INDEXABLE, OPEN_DAYS, SITE } from "./_data/site";
import MlMotion from "./_components/MlMotion";
import MlNav from "./_components/MlNav";
import MlFooter from "./_components/MlFooter";
import ScoopCursor from "./_components/ScoopCursor";
import "./monsieurlong.css";

// 拉丁大字。品牌 Logo 已經是手寫花體，網站不再堆手寫字；
// 用高對比襯線去接那股法式甜點的血統。
const display = Instrument_Serif({
  variable: "--ml-font-display",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

// 中文不走 next/font。
//
// 實測：Noto Sans TC 與 Noto Serif TC 經 next/font 產生的 @font-face 分別是
// 298KB 與 206KB 的 CSS（CJK 家族被切成上百段 unicode-range，每段一條規則），
// 合計半 MB 擋在首次繪製前面——為了襯線中文付這個代價不划算。
// 改用系統字堆疊：台灣裝置上是 PingFang TC／Songti TC（Apple）、
// 微軟正黑／新細明（Windows）、Noto CJK（Android），品質都夠好且零位元組。
// 字堆疊定義在 monsieurlong.css 的 --ml-han / --ml-sans。

// 標籤、日期、狀態。等寬字讓「限定」「售完」看起來像系統輸出而非廣告。
const mono = DM_Mono({
  variable: "--ml-font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// 本站的 origin 由租戶登錄表決定（子網域，或客戶綁定自有網域後改用該網域），
// 不能沿用 NEXT_PUBLIC_SITE_URL——那是 Avalo 主站的網址。
const ORIGIN = tenantOrigin(getTenant("monsieurlong")!);

const DESCRIPTION =
  "Monsieur Long 隆先生，大稻埕貴德街上的手工 Gelato。法式甜點主廚每日現做，台灣當季果物與經典口味不定期更換，並承接品牌聯名、市集快閃、伴手禮與客製化蛋糕。";

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  // favicon 放 public/ 而非 app/ 內：app/ 內的 icon.svg 會產生帶內部路徑
  // （/sites/monsieurlong/icon.svg）的 <link>，把改寫前的實作路徑洩進 HTML。
  icons: { icon: "/sites/monsieurlong/icon.svg" },
  title: {
    default: "Monsieur Long 隆先生｜大稻埕手工 Gelato 義式冰淇淋",
    template: "%s｜Monsieur Long 隆先生",
  },
  description: DESCRIPTION,
  keywords: [
    "Monsieur Long",
    "隆先生",
    "大稻埕 冰淇淋",
    "迪化街 gelato",
    "貴德街 冰淇淋",
    "台北 義式冰淇淋",
    "手工 Gelato",
    "客製化蛋糕",
    "伴手禮",
  ],
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  alternates: { canonical: "/" },
  openGraph: {
    title: "Monsieur Long 隆先生｜大稻埕手工 Gelato",
    description: "每天現做，每天不一樣。大稻埕貴德街上的義式手工冰淇淋。",
    type: "website",
    locale: "zh_TW",
    siteName: SITE.name,
    url: ORIGIN,
    images: [{ url: "/sites/monsieurlong/og.png", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monsieur Long 隆先生｜大稻埕手工 Gelato",
    description: "每天現做，每天不一樣。",
    images: ["/sites/monsieurlong/og.png"],
  },
};

// schema.org 有 IceCreamShop 這個型別，比泛用的 Store 精準，
// 也直接對上「大稻埕 冰淇淋」這種在地搜尋意圖。
// 刻意不放 aggregateRating：那份評分是 Google 的資料，
// 自己在網站上宣告等於未經驗證的自誇，反而有結構化資料違規的風險。
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "IceCreamShop",
  "@id": `${ORIGIN}/#shop`,
  name: SITE.name,
  alternateName: [SITE.nameEn, SITE.nameZh],
  description: DESCRIPTION,
  slogan: SITE.tagline,
  url: ORIGIN,
  image: `${ORIGIN}/sites/monsieurlong/og.png`,
  servesCuisine: ["Gelato", "義式冰淇淋", "法式甜點"],
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.locality,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: "TW",
  },
  geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
  hasMap: SITE.mapsUrl,
  sameAs: [SITE.instagram, SITE.threads],
  openingHoursSpecification: OPEN_DAYS.map((d) => {
    const i = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(d);
    const h = HOURS[i]!;
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${d}`,
      opens: h.open,
      closes: h.close,
    };
  }),
};

export default function MonsieurLongLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${display.variable} ${mono.variable}`}>
      <body className="ml">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Motion 會把 initial（opacity: 0）SSR 進 HTML。JS 沒跑起來時
            動畫不會把它們帶回 1，整個首頁會是空白的——這裡兜底。 */}
        <noscript>
          <style>{`.ml [style*="opacity:0"],.ml [style*="opacity: 0"]{opacity:1!important;filter:none!important;transform:none!important}`}</style>
        </noscript>
        <a className="ml-skip" href="#main">
          跳到主要內容
        </a>
        <MlMotion>
          <MlNav />
          <main id="main">{children}</main>
          <MlFooter />
          <ScoopCursor />
        </MlMotion>
      </body>
    </html>
  );
}
