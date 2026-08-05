"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import {
  fmt,
  PROMO_INCLUDES,
  PROMO_PLANS,
  promoPlanTotal,
  type PromoPlan,
} from "@/lib/products";
import type { Locale } from "@/i18n/routing";

function PlanCard({ plan, locale }: { plan: PromoPlan; locale: Locale }) {
  const t = useTranslations("promo");
  const info = plan.i18n[locale];
  const { add, has } = useCart();
  const router = useRouter();

  // 兩個方案交付內容相同，差別只在付款方式，所以「已選擇」要看整組 SKU 是否都在購物車。
  // 也因此 launch-care 單獨在購物車時只算方案 B 已選，不會兩張卡同時亮起。
  const chosen =
    plan.skus.every((s) => has(s)) &&
    // 方案 B 只含 launch-care，若購物車另有 launch-setup 就是方案 A
    (plan.skus.includes("launch-setup") || !has("launch-setup"));

  const choose = () => {
    // cart 的 add 用函式式更新，連續呼叫可安全累加
    for (const sku of plan.skus) add(sku);
    router.push("/cart");
  };

  return (
    <div className={`promo-plan${plan.featured ? " featured" : ""}`}>
      {plan.featured && <div className="promo-plan-flag">{t("recommended")}</div>}
      <div className="promo-plan-name">{info.name}</div>
      <p className="promo-plan-tagline">{info.tagline}</p>

      <div className="promo-plan-price">
        <div className="promo-price-row">
          <span className="promo-price-label">{t("setupFee")}</span>
          <span className="promo-price-value">
            {plan.setup === 0 ? (
              <em className="promo-free">{t("noSetupFee")}</em>
            ) : (
              <>
                <span className="promo-cur">NT$</span>
                {fmt(plan.setup)}
              </>
            )}
          </span>
        </div>
        <div className="promo-price-row">
          <span className="promo-price-label">{t("monthlyFee")}</span>
          <span className="promo-price-value">
            <span className="promo-cur">NT$</span>
            {fmt(plan.monthly)}
            <span className="promo-per">{t("perMonth")}</span>
          </span>
        </div>
        <div className="promo-price-row promo-term">
          <span className="promo-price-label">{t("term")}</span>
          <span className="promo-price-value">
            {t("months", { n: plan.termMonths })}
          </span>
        </div>
      </div>

      <ul className="promo-plan-terms">
        {info.terms.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <div className="promo-plan-total">
        {t("termTotal", { n: plan.termMonths })}
        <b>NT${fmt(promoPlanTotal(plan))}</b>
      </div>

      {chosen ? (
        <button className="btn-ghost promo-cta" onClick={() => router.push("/cart")}>
          {t("inCart")}
        </button>
      ) : (
        <button className="btn-primary promo-cta" onClick={choose}>
          {t("choose", { name: info.name })}
        </button>
      )}
    </div>
  );
}

export default function PromoPlans() {
  const t = useTranslations("promo");
  const locale = useLocale() as Locale;
  if (PROMO_PLANS.length === 0) return null;

  return (
    <section className="promo-box fade-in" aria-labelledby="promo-heading">
      <div className="promo-box-head">
        <div className="promo-badge">{t("badge")}</div>
        <h3 id="promo-heading" className="promo-title">{t("title")}</h3>
        <p className="promo-intro">{t("intro")}</p>
      </div>

      {/* 交付內容只列一次——兩個方案拿到的東西完全一樣，差別僅在怎麼付 */}
      <div className="promo-includes">
        <div className="promo-includes-head">{t("includesHeading")}</div>
        <ul>
          {PROMO_INCLUDES[locale].map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      <div className="promo-choose-head">{t("chooseHeading")}</div>
      <div className="promo-plans">
        {PROMO_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} locale={locale} />
        ))}
      </div>

      <p className="promo-foot">{t("foot")}</p>
    </section>
  );
}
