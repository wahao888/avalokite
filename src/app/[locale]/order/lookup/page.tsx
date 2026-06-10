"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { fmt, getProduct } from "@/lib/products";
import type { Locale } from "@/i18n/routing";

interface LookupResult {
  id: string;
  status: string;
  items: { sku: string; qty: number }[];
  oneTimeTotal: number;
  monthlyTotal: number;
  payments: { kind: string; amount: number; status: string; paidAt: string | null }[];
  subscriptions: {
    sku: string;
    monthlyAmount: number;
    status: string;
    totalSuccessTimes: number;
    lastChargeAt: string | null;
  }[];
}

export default function OrderLookupPage() {
  const t = useTranslations("order");
  const locale = useLocale() as Locale;
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setResult(null);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setResult((await res.json()) as LookupResult);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const itemName = (sku: string) => getProduct(sku)?.i18n[locale].name ?? sku;

  return (
    <main className="page-wrap page-wrap-narrow">
      <div className="mono-label">ORDER LOOKUP</div>
      <h1 className="section-title">{t("lookupTitle")}</h1>
      <p className="section-intro" style={{ marginBottom: "2.5rem" }}>{t("lookupDesc")}</p>

      <form className="form-panel" onSubmit={onSubmit}>
        {notFound && <div className="form-feedback err">{t("lookupNotFound")}</div>}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="lk-id">{t("lookupOrderNo")}</label>
            <input id="lk-id" name="orderId" required className="form-input" placeholder="AVLXXXXXXXXXX" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="lk-email">{t("lookupEmail")}</label>
            <input id="lk-email" name="email" type="email" required className="form-input" />
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {t("lookupSubmit")}
        </button>
      </form>

      {result && (
        <div className="cart-summary">
          <div className="cart-summary-row total" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
            <span>{result.id}</span>
            <span className={`badge ${result.status}`}>{t(`status.${result.status}`)}</span>
          </div>

          <div className="cart-section-head">{t("itemsHeading")}</div>
          {result.items.map((i) => (
            <div className="cart-summary-row" key={i.sku}>
              <span>{itemName(i.sku)} × {i.qty}</span>
            </div>
          ))}

          <div className="cart-section-head">{t("paymentsHeading")}</div>
          {result.payments.map((p, idx) => (
            <div className="cart-summary-row" key={idx}>
              <span>
                {p.kind === "period"
                  ? locale === "en" ? "Subscription auth" : "定期定額授權"
                  : locale === "en" ? "One-time payment" : "一次性款項"}
                {" "}· NT${fmt(p.amount)}
              </span>
              <span className={`badge ${p.status}`}>{t(`status.${p.status}`)}</span>
            </div>
          ))}

          {result.subscriptions.length > 0 && (
            <>
              <div className="cart-section-head">{t("subsHeading")}</div>
              {result.subscriptions.map((s, idx) => (
                <div className="cart-summary-row" key={idx}>
                  <span>
                    NT${fmt(s.monthlyAmount)}{locale === "en" ? "/mo" : "/月"}
                    {" "}· {locale === "en" ? "charged" : "已扣"} {s.totalSuccessTimes}
                    {locale === "en" ? " times" : " 期"}
                  </span>
                  <span className={`badge ${s.status}`}>{t(`subStatus.${s.status}`)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </main>
  );
}
