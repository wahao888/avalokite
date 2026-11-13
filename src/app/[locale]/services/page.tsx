import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import Doodle, { type DoodleName } from "@/components/Doodle";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { ADDONS, fmt, getProduct } from "@/lib/products";
import { getService, servicePath } from "@/lib/services";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/services",
    title: zh ? "服務項目｜網頁設計、電商、LINE AI 客服、GEO｜Avalo 阿瓦羅" : "Services | Web design, commerce, LINE AI, GEO | Avalo",
    description: zh
      ? "形象官網、商務網站、LINE AI 客服、企業自動化、GEO、維護與金流。價格公開，可線上下單。"
      : "Brand sites, commerce, LINE AI support, automation, GEO, care and payments. Published prices, order online.",
  });
}

// 索引頁的卡片只放「一句話＋起價＋交期」，細節留給各服務頁。
// 起價不手抄：from 指到 products.ts 的方案（sku）或單項功能（addon），對不到就讓 build 失敗。
// 交期取自 services.ts 各服務的 timeline，沒有固定交期的不寫。
interface Card {
  slug: string;
  icon: DoodleName;
  from: { sku: string } | { addon: string };
  fixed?: boolean; // 單一定價，不標「起」
  zh: { blurb: string; time?: string };
  en: { blurb: string; time?: string };
}

const GROUPS: { zh: { name: string; note: string }; en: { name: string; note: string }; cards: Card[] }[] = [
  {
    zh: { name: "蓋網站", note: "門面、賣場、收款" },
    en: { name: "Build", note: "Storefront, shop, payments" },
    cards: [
      {
        slug: "website",
        icon: "browser",
        from: { sku: "web-basic" },
        zh: { blurb: "全客製、不套版，5 頁以內，含部署上線。", time: "2–3 週" },
        en: { blurb: "Fully custom, up to five pages, deployed.", time: "2–3 wks" },
      },
      {
        slug: "ecommerce",
        icon: "cart",
        from: { sku: "web-commerce" },
        zh: { blurb: "購物車或預約、金流與訂單後台一次到位。", time: "3–5 週" },
        en: { blurb: "Cart or booking, payments and an order dashboard.", time: "3–5 wks" },
      },
      {
        slug: "payment",
        icon: "card",
        from: { addon: "payment" },
        zh: { blurb: "綠界、藍新；信用卡一次付清與定期定額。" },
        en: { blurb: "ECPay and NewebPay; one-off and recurring cards." },
      },
    ],
  },
  {
    zh: { name: "導入 AI", note: "客服、流程、搜尋能見度" },
    en: { name: "Add AI", note: "Support, workflows, visibility" },
    cards: [
      {
        slug: "line-ai-chatbot",
        icon: "chat",
        from: { sku: "ai-chatbot-lite" },
        zh: { blurb: "用你的 FAQ 與價目，全天候回覆客人。", time: "2–3 週" },
        en: { blurb: "Answers from your FAQ and prices, after hours too.", time: "2–3 wks" },
      },
      {
        slug: "ai-automation",
        icon: "gears",
        from: { sku: "automation" },
        zh: { blurb: "訂單、對帳、報表，重複的事交給系統跑。" },
        en: { blurb: "Orders, reconciliation, reports — run by the system." },
      },
      {
        slug: "geo",
        icon: "search",
        from: { sku: "site-rescue" },
        zh: { blurb: "讓 ChatGPT 與 Google 都找得到你。" },
        en: { blurb: "Be found by ChatGPT, Gemini and Google." },
      },
    ],
  },
  {
    zh: { name: "顧網站", note: "上線之後有人看著" },
    en: { name: "Care", note: "Looked after once live" },
    cards: [
      {
        slug: "maintenance",
        icon: "shield",
        from: { sku: "care-basic" },
        zh: { blurb: "主機、SSL、每日備份與安全更新。" },
        en: { blurb: "Hosting, SSL, daily backups and security updates." },
      },
      {
        slug: "website-audit",
        icon: "pulse",
        from: { sku: "site-rescue" },
        fixed: true,
        zh: { blurb: "檢查速度、SEO 與資安，交書面報告。", time: "一週內" },
        en: { blurb: "Speed, SEO, security and AI visibility, in writing.", time: "1 week" },
      },
    ],
  },
];

function fromPrice(from: Card["from"]): { price: number; monthly: boolean } {
  if ("sku" in from) {
    const p = getProduct(from.sku);
    if (!p) throw new Error(`services 索引頁引用了不存在的方案：${from.sku}`);
    return { price: p.price, monthly: p.type === "monthly" };
  }
  const a = ADDONS.find((x) => x.id === from.addon);
  if (!a) throw new Error(`services 索引頁引用了不存在的單項功能：${from.addon}`);
  return { price: a.price, monthly: false };
}

export default async function ServicesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const loc = zh ? "zh-TW" : "en";

  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "服務" : "Services", path: "/services" },
        ])}
      />

      <header className="ip-hero">
        <div>
          <div className="mono-label">SERVICES</div>
          <h1 className="section-title ip-title">
            {zh ? "服務項目" : "Services"}
            <Doodle name="underline" stretch />
          </h1>
          <p className="ip-lede">
            {zh ? "八項服務，每一項都先把價格與交期寫清楚。" : "Eight services, each with its price and timeline up front."}
          </p>
          <ul className="ip-chips">
            <li>{zh ? "價格公開" : "Published prices"}</li>
            <li>{zh ? "標準方案線上下單" : "Order standard plans online"}</li>
            <li>{zh ? "客製免費諮詢" : "Free consult for custom work"}</li>
          </ul>
        </div>
        <div className="ip-hero-art">
          <Doodle name="heroServices" />
        </div>
      </header>

      {GROUPS.map((g, gi) => (
        <section className="ip-section" key={g.zh.name}>
          <div className="ip-head">
            <span className="ip-num">0{gi + 1}</span>
            <h2 className="ip-h2">{g[zh ? "zh" : "en"].name}</h2>
            <span className="ip-head-note">{g[zh ? "zh" : "en"].note}</span>
          </div>
          <div className="svc-grid">
            {g.cards.map((c) => {
              const s = getService(c.slug);
              if (!s) throw new Error(`services 索引頁引用了不存在的服務：${c.slug}`);
              const copy = c[zh ? "zh" : "en"];
              const { price, monthly } = fromPrice(c.from);
              return (
                <Link key={c.slug} href={servicePath(c.slug)} className="svc-card">
                  <div className="svc-card-top">
                    <Doodle name={c.icon} size={56} />
                    <h3 className="svc-card-name">{s.i18n[loc].name}</h3>
                  </div>
                  <p className="svc-card-blurb">{copy.blurb}</p>
                  <div className="svc-card-foot">
                    <span className="svc-card-price">
                      NT${fmt(price)}
                      <small>
                        {zh
                          ? `${monthly ? "／月" : ""}${c.fixed ? "" : " 起"}`
                          : `${c.fixed ? "" : "+"}${monthly ? " /mo" : ""}`}
                      </small>
                    </span>
                    <span className="svc-card-meta">
                      {copy.time}
                      <span className="svc-card-go" aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <div className="ip-cta">
        <div className="ip-cta-text">
          <Doodle name="check" size={52} />
          <div>
            <div className="ip-cta-t">{zh ? "不確定選哪一項？" : "Not sure which one?"}</div>
            <p className="ip-cta-d">{zh ? "三題幫你挑方案，或直接問我們。價格皆未稅。" : "Three questions to pick a plan — or just ask. Prices exclude VAT."}</p>
          </div>
        </div>
        <div className="ip-cta-actions">
          <Link href="/quiz" className="btn-primary">{zh ? "三題挑方案 →" : "Pick a plan →"}</Link>
          <LineCta label={zh ? "加 LINE 諮詢" : "Ask on LINE"} className="btn-ghost" />
        </div>
      </div>
    </main>
  );
}
