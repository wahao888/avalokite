"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { fmt, getProduct, withTax } from "@/lib/products";
import type { Locale } from "@/i18n/routing";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const cart = useCart();

  const oneTime = cart.items.filter((i) => getProduct(i.sku)?.type === "onetime");
  const monthly = cart.items.filter((i) => getProduct(i.sku)?.type === "monthly");

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
      {monthly.length > 0 && (
        <>
          <div className="cart-section-head">{t("monthlySection")}</div>
          {monthly.map((i) => renderRow(i.sku, i.qty))}
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
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <Link href="/checkout" className="btn-primary">{t("checkout")}</Link>
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
