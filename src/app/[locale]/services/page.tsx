import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import Doodle from "@/components/Doodle";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { SERVICE_GROUPS, cardPriceLabel } from "@/lib/service-cards";
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

      {SERVICE_GROUPS.map((g, gi) => (
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
              const price = cardPriceLabel(c, zh);
              return (
                <Link key={c.slug} href={servicePath(c.slug)} className="svc-card">
                  <div className="svc-card-top">
                    <Doodle name={c.icon} size={56} />
                    <h3 className="svc-card-name">{s.i18n[loc].name}</h3>
                  </div>
                  <p className="svc-card-blurb">{copy.blurb}</p>
                  <div className="svc-card-foot">
                    <span className="svc-card-price">
                      {price.amount}
                      <small>{price.suffix}</small>
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
