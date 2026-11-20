import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import LineCta from "@/components/LineCta";
import TrustMarks from "@/components/TrustMarks";
import { PriceCard } from "@/components/sections/Pricing";
import { breadcrumbLd, faqLd, pageMetadata, serviceLd } from "@/lib/seo";
import { SERVICES, filledCopy, getService, servicePath } from "@/lib/services";
import { ADDONS, BUILD_COMMIT_MONTHS, fmt, getProduct } from "@/lib/products";
import { routing, type Locale } from "@/i18n/routing";
import zhTW from "@/messages/zh-TW.json";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SERVICES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  const c = filledCopy(s, locale);
  return pageMetadata({ locale, path: servicePath(slug), title: c.title, description: c.description });
}

export default async function ServicePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const s = getService(slug);
  if (!s) notFound();
  const c = filledCopy(s, locale);
  const zh = locale !== "en";
  const loc = (locale === "en" ? "en" : "zh-TW") as Locale;
  const website = slug === "website";
  const consult = zh ? "免費諮詢" : "Free consultation";
  const products = s.skus.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p);
  const websiteBuild = website ? products[0] : undefined;
  const websiteCare = websiteBuild?.recommendedCareSku ? getProduct(websiteBuild.recommendedCareSku) : undefined;
  const addons = ADDONS.filter((a) => s.addons.includes(a.id));
  const cases = ((zhTW as { cases?: { items?: { url?: string; name?: string }[] } }).cases?.items ?? []).filter((i) =>
    s.cases.includes(i.url ?? ""),
  );

  return (
    <main className={website ? "page-wrap website-landing" : "page-wrap"}>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "服務" : "Services", path: "/services" },
          { name: c.name, path: servicePath(slug) },
        ])}
      />
      <JsonLd
        data={serviceLd({
          locale,
          path: servicePath(slug),
          name: c.name,
          description: c.description,
          serviceType: s.serviceType,
          skus: s.skus,
        })}
      />
      <JsonLd data={faqLd(c.faq)} />
      {website ? (
        <>
          <header className="website-hero">
            <div>
              <h1 className="section-title">{c.name}</h1>
              <p className="fa-lede">
                {zh
                  ? "5 頁以內客製設計，含手機版與部署。文案和圖片齊備後約 2–3 週上線。"
                  : "Custom design for up to 5 pages, with mobile design and deployment. Launch in about 2–3 weeks once content is ready."}
              </p>
              {websiteBuild && websiteCare && (
                <>
                  <dl className="website-price-summary">
                    <div>
                      <dt>{zh ? "一次性建置" : "One-time build"}</dt>
                      <dd>{zh ? `NT$${fmt(websiteBuild.price)} 起` : `From NT$${fmt(websiteBuild.price)}`}</dd>
                    </div>
                    <div>
                      <dt>{zh ? "搭配安心維護" : "With Essential Care"}</dt>
                      <dd>{zh ? `NT$${fmt(websiteCare.price)}／月` : `NT$${fmt(websiteCare.price)}/mo`}</dd>
                    </div>
                  </dl>
                  <p className="website-price-terms">
                    {zh
                      ? `皆未稅。建置須搭維護，最短 ${BUILD_COMMIT_MONTHS} 個月，驗收並授權後開始計月費。`
                      : `Prices exclude VAT. Care is required for at least ${BUILD_COMMIT_MONTHS} months and billed after acceptance and payment authorization.`}
                  </p>
                </>
              )}
              <div className="fa-hero-cta">
                <a href="#website-consult" className="btn-primary">
                  {zh ? "填表免費諮詢" : "Request a free consultation"}
                </a>
              </div>
              <p className="website-reply">{zh ? "工作日 24 小時內回覆" : "Replies within 24 hours on business days"}</p>
            </div>
            <Link href="/cases/monsieurlong" className="website-case">
              <div className="website-case-image">
                <Image src="/cases/monsieurlong.jpg" alt="" fill sizes="(max-width: 720px) 96px, 440px" />
              </div>
              <span className="website-case-caption">{zh ? "看實際案例 · 隆先生品牌官網" : "See the Monsieur Long case study"}</span>
              <span className="website-case-arrow" aria-hidden="true">→</span>
            </Link>
          </header>
          <section id="website-consult" className="website-consult fa-section" aria-labelledby="website-consult-title">
            <div>
              <h2 id="website-consult-title" className="fa-h2">{consult}</h2>
              <p className="fa-lede">{zh ? "留 Email 或 LINE ID，告訴我們你想做的網站。" : "Leave an email or LINE ID and tell us about the site you want to build."}</p>
              <LineCta label={zh ? "加 LINE 詢問" : "Ask on LINE"} className="btn-ghost" />
            </div>
            <ContactForm placement="website" />
          </section>
        </>
      ) : (
        <>
          <p className="mono-label">{c.label}</p>
          <h1 className="section-title" style={{ whiteSpace: "pre-line" }}>{c.h1}</h1>
          <p className="fa-lede">{c.lede}</p>
          <div className="fa-hero-cta" style={{ marginBottom: "3rem" }}>
            <Link href="/pricing" className="btn-primary">{zh ? "看透明定價 →" : "See pricing →"}</Link>
            <LineCta label={zh ? "加 LINE 免費諮詢" : "Chat on LINE"} className="btn-ghost" />
          </div>
        </>
      )}
      <TrustMarks locale={locale} />

      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "適合誰" : "Who it is for"}</h2>
        <ul className="prose-list">
          {c.fit.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>

      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "這裡做什麼" : "What we do"}</h2>
        <div className="fa-why">
          {c.points.map((p, i) => (
            <div className="fa-why-item" key={p.t}>
              <div className="fa-why-num">0{i + 1}</div>
              <div className="fa-why-t">{p.t}</div>
              <div className="fa-why-d">{p.d}</div>
            </div>
          ))}
        </div>
        {c.timeline && <p className="fa-p" style={{ marginTop: "1.5rem" }}>{c.timeline}</p>}
      </section>

      {products.length > 0 && (
        <section className="fa-section">
          <h2 className="fa-h2">{zh ? "方案" : "Plans"}</h2>
          <div className="pricing-grid">
            {products.map((p) => (
              <PriceCard key={p.sku} product={p} locale={loc} />
            ))}
          </div>
        </section>
      )}

      {addons.length > 0 && (
        <section className="fa-section">
          <h2 className="fa-h2">{zh ? "可加購" : "Add-ons"}</h2>
          {/* 單項功能沒有加入購物車：範圍因案而異，價格是參考價，要先談過才報價 */}
          <p className="fa-p" style={{ marginBottom: "1.25rem" }}>
            {zh
              ? "以下為未稅參考價，實際依整合範圍於諮詢後書面報價，可加在任一方案上。"
              : "Reference prices excl. VAT. Final pricing depends on scope and is quoted in writing after a consultation; can be added to any plan."}{" "}
            <Link href="/contact">{zh ? "詢問加購 →" : "Ask about add-ons →"}</Link>
          </p>
          <div className="addon-grid">
            {addons.map((a) => (
              <div className="addon-item" key={a.id}>
                <div className="addon-main">
                  <div className="addon-name">{a.i18n[loc].name}</div>
                  <div className="addon-desc">{a.i18n[loc].desc}</div>
                </div>
                <div className="addon-price">NT${a.price.toLocaleString("en-US")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {cases.length > 0 && (
        <section className="fa-section">
          <h2 className="fa-h2">{zh ? "相關案例" : "Related work"}</h2>
          <ul className="prose-list">
            {cases.map((x) => (
              <li key={x.url}>
                <Link href={x.url!}>{x.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "常見問題" : "FAQ"}</h2>
        <FaqList items={c.faq} />
      </section>

      <section className="fa-final">
        <h2 className="fa-final-t">{zh ? "下一步" : "Next step"}</h2>
        <div className="fa-hero-cta" style={{ justifyContent: "center" }}>
          {website ? <a href="#website-consult" className="btn-primary">{consult}</a> : (
            <Link href="/contact" className="btn-primary">{consult}</Link>
          )}
          <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
        </div>
      </section>
    </main>
  );
}
