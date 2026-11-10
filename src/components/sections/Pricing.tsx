import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ADDONS,
  fmt,
  monthlyProducts,
  oneTimeProducts,
  plansUsingCare,
  type Product,
} from "@/lib/products";
import AddToCartButton from "@/components/AddToCartButton";
import PromoPlans from "@/components/sections/PromoPlans";
import PricingTabs from "@/components/PricingTabs";
import type { Locale } from "@/i18n/routing";

export function PriceCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = useTranslations("pricing");
  const info = product.i18n[locale];
  const applies = product.type === "monthly" ? plansUsingCare(product.sku) : [];
  const badge = product.badge?.[locale] ?? (product.featured ? t("featured") : null);

  return (
    <div className={`price-card${product.featured || product.badge ? " featured" : ""}`}>
      {badge && <div className="featured-badge">{badge}</div>}
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
      {product.promoNote && (
        <div className="price-promo-note">{product.promoNote[locale]}</div>
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

      {/* 促銷方案自成一個外框區塊：它是「一個方案、兩種付法」，
          渲染成兩張商品卡會讓人以為是兩個不同的產品（實際踩過） */}
      <PromoPlans />

      {/* 22 個項目改成三個分頁，一次只看一組 */}
      <PricingTabs
        tabs={[
          {
            id: "build",
            label: t("tabs.build"),
            panel: (
              <div className="pricing-grid">
                {oneTimeProducts().map((p) => (
                  <PriceCard key={p.sku} product={p} locale={locale} />
                ))}
              </div>
            ),
          },
          {
            id: "care",
            label: t("tabs.care"),
            panel: (
              <>
                <p className="ptabs-intro">{t("monthlyHeading")}</p>
                <div className="pricing-grid">
                  {monthlyProducts().map((p) => (
                    <PriceCard key={p.sku} product={p} locale={locale} />
                  ))}
                </div>
              </>
            ),
          },
          {
            id: "addon",
            label: t("tabs.addon"),
            panel: (
              <>
                <p className="ptabs-intro">{t("addonIntro")}</p>
                <div className="addon-grid">
                  {ADDONS.map((a) => (
                    <div className="addon-item" key={a.i18n[locale].name}>
                      <div className="addon-main">
                        <div className="addon-name">{a.i18n[locale].name}</div>
                        <div className="addon-desc">{a.i18n[locale].desc}</div>
                      </div>
                      <div className="addon-price">
                        NT${fmt(a.price)}
                        <span className="addon-from">{t("addonFrom")}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="addon-note">{t("addonNote")}</p>
              </>
            ),
          },
        ]}
      />

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
          <Link href="/contact" className="btn-ghost">
            {t("custom.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
