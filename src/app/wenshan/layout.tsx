import type { Metadata } from "next";
import { Noto_Serif_TC, Noto_Sans_TC, DM_Mono } from "next/font/google";
import { SITE, INDEXABLE, WS } from "./_data/site";
import { QuoteListProvider } from "./_components/QuoteListProvider";
import QuoteListFab from "./_components/QuoteListFab";
import WsNav from "./_components/WsNav";
import WsFooter from "./_components/WsFooter";
import StickyCta from "./_components/StickyCta";
import WsScrollFx from "./_components/WsScrollFx";
import "./wenshan.css";

const serif = Noto_Serif_TC({
  variable: "--ws-font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sans = Noto_Sans_TC({
  variable: "--ws-font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = DM_Mono({
  variable: "--ws-font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "文山木材行｜北投關渡 木材・角材・夾板專門",
    template: "%s｜文山木材行",
  },
  description:
    "文山木材行，深耕北投關渡近百年、傳承三代。角材、夾板、木心板、南方松現貨齊全，代客裁切，雙北工地免費配送。線上估價，黃老闆親自為你選料。",
  robots: INDEXABLE ? undefined : { index: false, follow: false },
  openGraph: {
    title: "文山木材行｜北投關渡 木材・角材・夾板專門",
    description:
      "深耕關渡近百年、傳承三代。木料現貨齊全、代客裁切，雙北工地免費配送。",
    type: "website",
    locale: "zh_TW",
    images: [{ url: "/wenshan/og.png", width: 1200, height: 630 }],
  },
};

// 客戶網域綁定後：INDEXABLE 改 true（_data/site.ts），並於 next.config.ts 加 host rewrite
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  additionalType: "https://schema.org/HardwareStore",
  name: SITE.name,
  description: "木材行：角材、夾板、板材零售批發，代客裁切，雙北免費配送。",
  telephone: SITE.phoneIntl,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.locality,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: "TW",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: SITE.geo.lat,
    longitude: SITE.geo.lng,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: SITE.openingDays,
    opens: SITE.opens,
    closes: SITE.closes,
  },
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") + WS,
};

export default function WenshanLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="ws">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <QuoteListProvider>
          <WsNav />
          {children}
          <WsFooter />
          <StickyCta />
          <QuoteListFab />
          <WsScrollFx />
        </QuoteListProvider>
      </body>
    </html>
  );
}
