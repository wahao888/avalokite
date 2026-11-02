// 主站各頁的 canonical／hreflang、分享卡與結構化資料（JSON-LD）。
//
// 網址規則跟 next-intl 的 localePrefix: "as-needed" 一致：預設語系 zh-TW 沒有前綴
// （/cases/rekat），其他語系才有（/en/cases/rekat）。sitemap、<link rel="canonical">
// 與 next-intl 送出的 Link 標頭必須是同一組網址，三者對不上時搜尋引擎會自己挑一個。
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { COMPANY, LINE_URL, SITE } from "@/lib/site";
import { getProduct, oneTimeProducts, monthlyProducts, fmt, type Product } from "@/lib/products";
import zhTW from "@/messages/zh-TW.json";

type Loc = "zh-TW" | "en";
const loc = (locale: string): Loc => (locale === "en" ? "en" : "zh-TW");

export function localeUrl(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const p = path === "/" ? "" : path;
  const url = `${SITE.url}${prefix}${p}`;
  // 預設語系的首頁會變成裸 origin（沒有路徑），補上斜線才是合法的 <loc> 與 canonical
  return prefix === "" && p === "" ? `${url}/` : url;
}

/** 同一頁各語系的網址；x-default 指向預設語系，給語系都不符的訪客 */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l, path)])),
    "x-default": localeUrl(routing.defaultLocale, path),
  };
}

export interface OgImage {
  url: string;
  width: number;
  height: number;
}

// 由 scripts/avalo-og.mjs 產生；改了品牌標語要重跑
const OG_DEFAULT: Record<Loc, OgImage> = {
  "zh-TW": { url: "/og.png", width: 1200, height: 630 },
  en: { url: "/og-en.png", width: 1200, height: 630 },
};

const OG_LOCALE: Record<Loc, string> = { "zh-TW": "zh_TW", en: "en_US" };

/** 案例頁的分享圖沿用首頁案例卡的封面（public/cases/<id>.jpg） */
export function caseImage(path: string): OgImage | undefined {
  const items = (zhTW as { cases?: { items?: { id?: string; url?: string }[] } }).cases?.items ?? [];
  const id = items.find((i) => i.url === path)?.id;
  return id ? { url: `/cases/${id}.jpg`, width: 1200, height: 750 } : undefined;
}

/** 案例頁：帶封面圖、canonical、hreflang 的完整 metadata */
export function caseMeta(
  locale: string,
  path: string,
  zh: { title: string; description: string },
  en: { title: string; description: string },
) {
  const copy = locale === "en" ? en : zh;
  return pageMetadata({
    locale,
    path,
    title: copy.title,
    description: copy.description,
    image: caseImage(path),
  });
}

/**
 * 一頁完整的 metadata：title、description、canonical、hreflang、OG 與 Twitter 卡。
 *
 * openGraph／twitter 在 Next 是「整包覆寫」而非逐欄合併——子頁只要定義了
 * openGraph，layout 那份就整個不見。所以每頁都從這裡拿完整的一包，不要只補一兩欄。
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  image?: OgImage;
}): Metadata {
  const l = loc(locale);
  const img = { ...(image ?? OG_DEFAULT[l]), alt: title };
  return {
    title,
    description,
    alternates: { canonical: localeUrl(locale, path), languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: OG_LOCALE[l],
      alternateLocale: routing.locales.filter((x) => x !== l).map((x) => OG_LOCALE[loc(x)]),
      url: localeUrl(locale, path),
      title,
      description,
      images: [img],
    },
    twitter: { card: "summary_large_image", title, description, images: [img.url] },
  };
}

// ─── 結構化資料 ───────────────────────────────────────────

export const ORG_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;
const TAIWAN = { "@type": "Country", name: "Taiwan" };

/** 「臺北市大安區大安路…」拆成 schema.org 的地址欄位；格式不符就整串放街道 */
function postalAddress(address: string) {
  const m = address.match(/^(.+?[市縣])(.+?[區鄉鎮市])(.+)$/);
  return {
    "@type": "PostalAddress",
    ...(m
      ? { addressRegion: m[1], addressLocality: m[2], streetAddress: m[3] }
      : { streetAddress: address }),
    addressCountry: "TW",
  };
}

/** 價格皆為未稅；月費方案標上計價單位，免得被讀成一次性價格 */
export function offerLd(p: Product, locale: string) {
  const t = p.i18n[loc(locale)];
  return {
    "@type": "Offer",
    name: t.name,
    description: t.desc,
    price: p.price,
    priceCurrency: "TWD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: p.price,
      priceCurrency: "TWD",
      valueAddedTaxIncluded: false,
      ...(p.type === "monthly" ? { unitCode: "MON", unitText: loc(locale) === "en" ? "per month" : "每月" } : {}),
    },
    url: localeUrl(locale, "/pricing"),
  };
}

/** 跨頁引用時給的精簡版組織資料；@id 跟首頁那份相同，讓解析器能把兩者接起來 */
const providerLd = () => ({ "@type": "ProfessionalService", "@id": ORG_ID, name: SITE.name, url: `${SITE.url}/` });

/**
 * 首頁的組織與網站資料。
 *
 * 品牌名「Avalo」在網路上有同名的 AI 公司與設計公司，搜尋引擎與 AI 要靠
 * 登記名稱、統編、地址、電話這些硬資料才分得出「哪一個 Avalo」。
 * 這些欄位一律取自 COMPANY（與綠界審核、頁尾揭露的是同一組字串）。
 */
export function homeGraphLd(locale: string, description: string) {
  const l = loc(locale);
  const standard = [...oneTimeProducts(), ...monthlyProducts()];
  const builds = oneTimeProducts().map((p) => p.price);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": ORG_ID,
        name: SITE.name,
        alternateName: ["Avalo", "阿瓦羅"],
        legalName: COMPANY.legalName,
        taxID: COMPANY.taxId,
        url: `${SITE.url}/`,
        logo: `${SITE.url}/brand/avalo-logo-512.png`,
        image: `${SITE.url}${OG_DEFAULT["zh-TW"].url}`,
        description,
        email: SITE.email,
        telephone: COMPANY.phoneTel,
        address: postalAddress(COMPANY.address),
        areaServed: TAIWAN,
        priceRange: `NT$${fmt(Math.min(...builds))}–NT$${fmt(Math.max(...builds))}`,
        // 與 messages 的 contact.items.hoursValue 一致
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "10:00",
            closes: "18:00",
          },
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: SITE.email,
            telephone: COMPANY.phoneTel,
            url: LINE_URL,
            availableLanguage: ["zh-TW", "en"],
          },
        ],
        sameAs: [LINE_URL].filter(Boolean),
        knowsAbout:
          l === "en"
            ? ["Web design", "E-commerce websites", "LINE AI customer service", "Business process automation", "Generative engine optimization (GEO)", "Payment gateway integration"]
            : ["網頁設計", "電商網站架設", "LINE 官方帳號 AI 客服", "企業流程自動化", "AI 搜尋優化（GEO）", "綠界金流串接"],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: l === "en" ? "Avalo standard plans" : "Avalo 標準方案",
          itemListElement: standard.map((p) => offerLd(p, locale)),
        },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: `${SITE.url}/`,
        name: SITE.name,
        alternateName: "Avalo",
        inLanguage: locale,
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

export function serviceLd({
  locale,
  path,
  name,
  description,
  serviceType,
  skus,
}: {
  locale: string;
  path: string;
  name: string;
  description: string;
  serviceType: string;
  skus: string[];
}) {
  const offers = skus.map(getProduct).filter((p): p is Product => !!p).map((p) => offerLd(p, locale));
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType,
    url: localeUrl(locale, path),
    inLanguage: locale,
    provider: providerLd(),
    areaServed: TAIWAN,
    ...(offers.length ? { offers } : {}),
  };
}

export function breadcrumbLd(locale: string, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: localeUrl(locale, c.path),
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function articleLd({
  locale,
  path,
  title,
  description,
  date,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  date: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    inLanguage: locale,
    url: localeUrl(locale, path),
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: localeUrl(locale, path),
  };
}
