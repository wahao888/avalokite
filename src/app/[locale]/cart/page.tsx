"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import {
  BUILD_COMMIT_MONTHS,
  careOptionsFor,
  fmt,
  getProduct,
  mixedBuildConflict,
  promoPlanForSkus,
  recommendedCareFor,
  withTax,
} from "@/lib/products";
import type { Locale } from "@/i18n/routing";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const cart = useCart();

  const oneTime = cart.items.filter((i) => getProduct(i.sku)?.type === "onetime");
  const monthly = cart.items.filter((i) => getProduct(i.sku)?.type === "monthly");

  // 車上有建置方案 → 必須擇一維護（自第一個月起計費），未選則不給結帳
  const skus = cart.items.map((i) => i.sku);
  // 促銷建置與正式建置同車 → 維護選項會被促銷價汙染，請客戶分兩張單
  const mixedBuilds = mixedBuildConflict(skus);
  const careOptions = careOptionsFor(skus);
  const careNeeded = careOptions.length > 0;
  const recommendedCare = recommendedCareFor(skus);
  const selectedCare = careOptions.find((o) => cart.has(o.sku));
  // 促銷方案的承諾期由方案自己公告（12／24 個月），與一般建置的 12 個月不同
  const isPromo = careOptions.some((o) => o.group === "promo");
  // 單購維護（無建置）時照舊以列表呈現，不進必選區塊
  const looseMonthly = monthly.filter(
    (i) => !careOptions.some((o) => o.sku === i.sku)
  );
  // 零元啟動＝單購 launch-care，走不到下面的必選維護區塊，
  // 但結帳仍會把 24 個月的承諾期寫進訂閱，所以承諾期得在月費區自己講。
  const loosePromoPlan = careNeeded ? undefined : promoPlanForSkus(skus);

  if (!cart.ready) return null; // 等 localStorage 載入，避免空車畫面閃現

  if (cart.items.length === 0) {
    return (
      <main className="page-wrap page-wrap-narrow" style={{ textAlign: "center" }}>
        <h1 className="section-title">{t("empty")}</h1>
        <p className="section-intro" style={{ marginBottom: "2.5rem" }}>{t("emptyDesc")}</p>
        <Link href={{ pathname: "/", hash: "pricing" }} className="btn-primary">
          {t("browse")}
        </Link>
      </main>
    );
  }

  const renderRow = (sku: string, qty: number) => {
    const p = getProduct(sku)!;
    const info = p.i18n[locale];
    return (
      <div className="cart-row" key={sku}>
        <div>
          <div className="cart-item-name">{info.name}</div>
          <div className="cart-item-unit">{info.label} · {info.unit}</div>
        </div>
        {p.type === "onetime" ? (
          <div className="cart-qty">
            <button onClick={() => cart.setQty(sku, qty - 1)} aria-label="-">−</button>
            <span>{qty}</span>
            <button onClick={() => cart.setQty(sku, qty + 1)} aria-label="+">＋</button>
          </div>
        ) : (
          <span className="cart-item-unit">×1</span>
        )}
        <div className="cart-price">
          NT${fmt(p.price * (p.type === "onetime" ? qty : 1))}
          {p.type === "monthly" && <span style={{ fontSize: "0.7rem" }}>{perMonthLabel(locale)}</span>}
        </div>
        <button className="cart-remove" onClick={() => cart.remove(sku)}>
          {t("remove")}
        </button>
      </div>
    );
  };

  const oneTimeTax = withTax(cart.oneTimeSubtotal) - cart.oneTimeSubtotal;
  const dueNow = withTax(cart.oneTimeSubtotal);
  const careBlocked = mixedBuilds || (careNeeded && !selectedCare);

  return (
    <main className="page-wrap page-wrap-narrow">
      <div className="mono-label">CART</div>
      <h1 className="section-title">{t("title")}</h1>

      {oneTime.length > 0 && (
        <>
          <div className="cart-section-head">{t("onetimeSection")}</div>
          {oneTime.map((i) => renderRow(i.sku, i.qty))}
        </>
      )}
      {looseMonthly.length > 0 && (
        <>
          <div className="cart-section-head">{t("monthlySection")}</div>
          {looseMonthly.map((i) => renderRow(i.sku, i.qty))}
          {loosePromoPlan && (
            <p className="care-commit-note">{t("careCommitPromo")}</p>
          )}
        </>
      )}

      {careNeeded && (
        <>
          <div className="cart-section-head">
            {t("careRequiredHeading")}
            <span className="care-required-tag">{t("careRequiredTag")}</span>
          </div>
          <p className="care-required-note">
            {mixedBuilds ? t("mixedBuildsBlocked") : t("careRequiredNote")}
          </p>
          {/* 綁約要在購物車就講清楚，不能只寫在條款裡等客戶自己去翻 */}
          {!mixedBuilds && (
            <p className="care-commit-note">
              {isPromo
                ? t("careCommitPromo")
                : t("careCommitNote", { months: BUILD_COMMIT_MONTHS })}
            </p>
          )}
          <div className="care-options" role="radiogroup" aria-label={t("careRequiredHeading")}>
            {careOptions.map((care) => {
              const info = care.i18n[locale];
              const chosen = selectedCare?.sku === care.sku;
              return (
                <button
                  key={care.sku}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  className={`care-option${chosen ? " chosen" : ""}`}
                  onClick={() => cart.add(care.sku)}
                >
                  <span className="care-option-check" aria-hidden>
                    {chosen ? "✓" : ""}
                  </span>
                  <span className="care-option-body">
                    <span className="cart-item-name">
                      {info.name}
                      {care.sku === recommendedCare && (
                        <span className="care-option-rec">{t("careRecommended")}</span>
                      )}
                    </span>
                    <span className="care-option-desc">{info.desc}</span>
                    <span className="care-option-features">
                      {info.features.slice(0, 3).join(" · ")}
                    </span>
                  </span>
                  <span className="cart-price">
                    NT${fmt(care.price)}
                    <span style={{ fontSize: "0.7rem" }}>{perMonthLabel(locale)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="cart-summary">
        {cart.oneTimeSubtotal > 0 && (
          <>
            <div className="cart-summary-row">
              <span>{t("subtotalOnetime")}</span>
              <span>NT${fmt(cart.oneTimeSubtotal)}</span>
            </div>
            <div className="cart-summary-row">
              <span>{t("tax")}</span>
              <span>NT${fmt(oneTimeTax)}</span>
            </div>
            <div className="cart-summary-row total">
              <span>{t("totalDueNow")}</span>
              <span className="amount">NT${fmt(dueNow)}</span>
            </div>
          </>
        )}
        {cart.monthlySubtotal > 0 && (
          <>
            <div className="cart-summary-row" style={{ marginTop: cart.oneTimeSubtotal > 0 ? "1rem" : 0 }}>
              <span>{t("subtotalMonthly")}</span>
              <span>NT${fmt(cart.monthlySubtotal)} {perMonthLabel(locale)}</span>
            </div>
            <div className="cart-monthly-note">
              ✦ {t("monthlyNote")}：NT${fmt(withTax(cart.monthlySubtotal))} {perMonthLabel(locale)}
            </div>
          </>
        )}
        {careBlocked && (
          <div className="cart-blocked-note">
            {mixedBuilds ? t("mixedBuildsBlocked") : t("careRequiredBlocked")}
          </div>
        )}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
          {careBlocked ? (
            <span className="btn-primary is-disabled" aria-disabled>{t("checkout")}</span>
          ) : (
            <Link href="/checkout" className="btn-primary">{t("checkout")}</Link>
          )}
          <Link href={{ pathname: "/", hash: "pricing" }} className="btn-ghost">
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </main>
  );
}

function perMonthLabel(locale: Locale) {
  return locale === "en" ? "/mo" : "/月";
}
