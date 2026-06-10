"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { fmt, getProduct, withTax } from "@/lib/products";
import type { Locale } from "@/i18n/routing";

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tl = useTranslations("legal");
  const locale = useLocale() as Locale;
  const cart = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  if (cart.items.length === 0) {
    if (typeof window !== "undefined") router.replace("/cart");
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale, items: cart.items }),
      });
      if (!res.ok) throw new Error();
      const { payUrl } = (await res.json()) as { payUrl: string };
      cart.clear();
      window.location.href = payUrl; // 自動送出表單導向綠界
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <main className="page-wrap">
      <div className="mono-label">CHECKOUT</div>
      <h1 className="section-title">{t("title")}</h1>

      <div className="checkout-grid">
        <form className="form-panel" onSubmit={onSubmit}>
          <div className="form-title">{t("contactInfo")}</div>
          {error && <div className="form-feedback err">{t("error")}</div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="co-name">{t("name")}</label>
              <input id="co-name" name="name" required maxLength={100} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="co-phone">{t("phone")}</label>
              <input id="co-phone" name="phone" required maxLength={50} className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="co-email">{t("email")}</label>
            <input id="co-email" name="email" type="email" required maxLength={200} className="form-input" />
            <div className="form-note">{t("emailNote")}</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="co-company">{t("company")}</label>
              <input id="co-company" name="company" maxLength={200} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="co-taxid">{t("taxId")}</label>
              <input id="co-taxid" name="taxId" maxLength={8} pattern="\d{8}" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="co-note">{t("note")}</label>
            <textarea id="co-note" name="note" maxLength={2000} className="form-textarea" placeholder={t("notePh")} />
          </div>

          <div className="form-group" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" required style={{ marginTop: "0.25rem" }} />
              <span>
                {t("agreement")}{" "}
                <Link href="/legal/terms" target="_blank" style={{ color: "var(--moss)" }}>{tl("terms")}</Link>{" "}
                {t("and")}{" "}
                <Link href="/legal/refund" target="_blank" style={{ color: "var(--moss)" }}>{tl("refund")}</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "1rem", fontSize: "0.8rem" }}
            disabled={submitting}
          >
            {submitting ? t("submitting") : t("submit")}
          </button>
        </form>

        <aside className="cart-summary" style={{ marginTop: 0 }}>
          <div className="form-title" style={{ fontSize: "1.2rem" }}>{t("orderSummary")}</div>
          {cart.items.map((i) => {
            const p = getProduct(i.sku)!;
            const info = p.i18n[locale];
            const qty = p.type === "onetime" ? i.qty : 1;
            return (
              <div className="cart-summary-row" key={i.sku}>
                <span>{info.name} × {qty}</span>
                <span>
                  NT${fmt(p.price * qty)}
                  {p.type === "monthly" && (locale === "en" ? "/mo" : "/月")}
                </span>
              </div>
            );
          })}
          {cart.oneTimeSubtotal > 0 && (
            <div className="cart-summary-row total">
              <span>{t("payOnetime")}</span>
              <span className="amount">NT${fmt(withTax(cart.oneTimeSubtotal))}</span>
            </div>
          )}
          {cart.monthlySubtotal > 0 && (
            <div className="cart-summary-row total">
              <span>{t("payMonthly")}</span>
              <span className="amount">NT${fmt(withTax(cart.monthlySubtotal))}</span>
            </div>
          )}
          <div className="cart-monthly-note">✦ {t("payHint")}</div>
        </aside>
      </div>
    </main>
  );
}
