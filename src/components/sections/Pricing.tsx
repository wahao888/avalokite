import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  fmt,
  monthlyProducts,
  oneTimeProducts,
  plansUsingCare,
  type Product,
} from "@/lib/products";
import AddToCartButton from "@/components/AddToCartButton";
import type { Locale } from "@/i18n/routing";

function PriceCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = useTranslations("pricing");
  const info = product.i18n[locale];
  const applies = product.type === "monthly" ? plansUsingCare(product.sku) : [];

  return (
    <div className={`price-card${product.featured ? " featured" : ""}`}>
      {product.featured && <div className="featured-badge">{t("featured")}</div>}
      <div className="price-label">{info.label}</div>
      <div className="price-name">{info.name}</div>
      <p className="price-desc">{info.desc}</p>
      <div className="price-amount">
        <span className="price-cur">NT$</span>
        {fmt(product.price)}
        {product.type === "monthly" && (
          <span className="price-per">{t("perMonth")}</span>
        )}
      </div>
      <div className="price-unit">TWD · {info.unit}</div>
      <div className="price-market">{product.marketRange[locale]}</div>
      <div className="price-divider" />
      {info.features.map((f) => (
        <div className="price-feature" key={f}>{f}</div>
      ))}
      {applies.length > 0 && (
        <div className="price-applies">
          {t("appliesTo")}
          {locale === "en" ? ": " : "："}
          {applies.map((p) => p.i18n[locale].name).join(locale === "en" ? ", " : "、")}
        </div>
      )}
      <div className="price-cta">
        <AddToCartButton sku={product.sku} />
      </div>
    </div>
  );
}

export default function Pricing() {
  const t = useTranslations("pricing");
  const locale = useLocale() as Locale;

  return (
    <section id="pricing" className="section pricing-section">
      <div className="section-header fade-in">
        <div>
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>
        </div>
        <div>
          <p className="section-intro" style={{ marginBottom: "1.5rem" }}>
            {t("intro")}
          </p>
          <div className="pricing-notice">{t("notice")}</div>
        </div>
      </div>

      <div className="pricing-subhead">{t("onetimeHeading")}</div>
      <div className="pricing-grid fade-in">
        {oneTimeProducts().map((p) => (
          <PriceCard key={p.sku} product={p} locale={locale} />
        ))}
      </div>

      <div className="pricing-subhead">{t("monthlyHeading")}</div>
      <div className="pricing-grid fade-in">
        {monthlyProducts().map((p) => (
          <PriceCard key={p.sku} product={p} locale={locale} />
        ))}
      </div>

      <div className="custom-quote fade-in">
        <div>
          <div className="price-label">{t("custom.label")}</div>
          <div className="price-name">{t("custom.name")}</div>
          <p className="price-desc" style={{ marginBottom: 0 }}>
            {t("custom.desc")}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="price-amount"
            style={{ fontSize: "1.4rem", marginBottom: "1rem" }}
          >
            {t("custom.price")}
          </div>
          <Link href={{ pathname: "/", hash: "contact" }} className="btn-ghost">
            {t("custom.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
