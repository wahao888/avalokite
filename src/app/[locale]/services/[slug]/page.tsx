import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import LineCta from "@/components/LineCta";
import TrustMarks from "@/components/TrustMarks";
import { PriceCard } from "@/components/sections/Pricing";
import { breadcrumbLd, faqLd, pageMetadata, serviceLd } from "@/lib/seo";
import { SERVICES, filledCopy, getService, servicePath } from "@/lib/services";
import { getProduct } from "@/lib/products";
import { ADDONS } from "@/lib/products";
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
  const products = s.skus.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p);
  const addons = ADDONS.filter((a) => s.addons.includes(a.id));
  const cases = ((zhTW as { cases?: { items?: { url?: string; name?: string }[] } }).cases?.items ?? []).filter((i) =>
    s.cases.includes(i.url ?? ""),
  );

  return (
    <main className="page-wrap">
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
      <p className="mono-label">{c.label}</p>
      <h1 className="section-title" style={{ whiteSpace: "pre-line" }}>{c.h1}</h1>
      <p className="fa-lede">{c.lede}</p>
      <div className="fa-hero-cta" style={{ marginBottom: "3rem" }}>
        <Link href="/pricing" className="btn-primary">{zh ? "看透明定價 →" : "See pricing →"}</Link>
        <LineCta label={zh ? "加 LINE 免費諮詢" : "Chat on LINE"} className="btn-ghost" />
      </div>
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
          <Link href="/contact" className="btn-primary">{zh ? "免費諮詢" : "Free consult"}</Link>
          <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
        </div>
      </section>
    </main>
  );
}
