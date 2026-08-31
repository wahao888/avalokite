"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import PromoUrgency from "@/components/sections/PromoUrgency";
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

  // 整組 SKU 都在購物車才算已選；多方案並存時，另一個方案多出的 SKU 也要排除，
  // 否則子集方案會跟著亮起（例：零元啟動只含 launch-care）。
  const others = PROMO_PLANS.filter((p) => p.id !== plan.id).flatMap((p) => p.skus);
  const chosen =
    plan.skus.every((s) => has(s)) &&
    others.every((s) => plan.skus.includes(s) || !has(s));

  const choose = () => {
    // cart 的 add 用函式式更新，連續呼叫可安全累加
    for (const sku of plan.skus) add(sku);
    router.push("/cart");
  };

  return (
    <div className={`promo-plan${plan.featured ? " featured" : ""}`}>
      {plan.featured && PROMO_PLANS.length > 1 && (
        <div className="promo-plan-flag">{t("recommended")}</div>
      )}
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
          {t("claim")}
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
        <PromoUrgency />
      </div>

      {/* 先講「拿到什麼」，付款條件才收進下方卡片——價格單看是月費，看起來會太薄 */}
      <div className="promo-includes">
        <div className="promo-includes-head">{t("includesHeading")}</div>
        <ul>
          {PROMO_INCLUDES[locale].map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>

      {PROMO_PLANS.length > 1 && (
        <div className="promo-choose-head">{t("chooseHeading")}</div>
      )}
      <div className={`promo-plans${PROMO_PLANS.length === 1 ? " single" : ""}`}>
        {PROMO_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} locale={locale} />
        ))}
      </div>

      <p className="promo-foot">{t("foot")}</p>
    </section>
  );
}
