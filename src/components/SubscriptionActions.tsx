"use client";

import { useState } from "react";
import { fmt, withTax } from "@/lib/products";

interface Option {
  sku: string;
  name: string;
  desc: string;
  price: number;
}

// 換方案 / 換卡 / 終止：三個動作都會終止綠界的現有授權（不可逆），
// 因此一律二次確認後才送出。表單以原生 POST 送出，不需要 JS 也能運作。
export default function SubscriptionActions({
  mtn,
  currentPrice,
  options,
  committed,
  labels,
}: {
  mtn: string;
  currentPrice: number;
  options: Option[];
  committed: boolean;
  labels: Record<string, string>;
}) {
  const [sku, setSku] = useState(options[0]?.sku ?? "");
  const selected = options.find((o) => o.sku === sku);
  const action = `/api/subscription/${mtn}`;

  return (
    <>
      {options.length > 0 && (
        <div style={{ marginTop: "2.5rem" }}>
          <div className="cart-section-head">{labels.changeHeading}</div>
          <p className="care-required-note">{labels.changeNote}</p>
          <form
            method="post"
            action={action}
            onSubmit={(e) => {
              if (!confirm(labels.changeConfirm)) e.preventDefault();
            }}
          >
            <input type="hidden" name="action" value="change" />
            <div className="care-options">
              {options.map((o) => (
                <label key={o.sku} className={`care-option${sku === o.sku ? " chosen" : ""}`}>
                  <span className="care-option-check" aria-hidden>{sku === o.sku ? "✓" : ""}</span>
                  <span className="care-option-body">
                    <span className="cart-item-name">{o.name}</span>
                    <span className="care-option-desc">{o.desc}</span>
                  </span>
                  <span className="cart-price">
                    NT${fmt(withTax(o.price))}
                    <span style={{ fontSize: "0.7rem" }}>{labels.perMonth}</span>
                  </span>
                  <input
                    type="radio"
                    name="sku"
                    value={o.sku}
                    checked={sku === o.sku}
                    onChange={() => setSku(o.sku)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                </label>
              ))}
            </div>
            {selected && (
              <p className="cart-monthly-note">
                NT${fmt(currentPrice)} → NT${fmt(withTax(selected.price))}
                {labels.perMonth}
              </p>
            )}
            <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>
              {labels.changeSubmit}
            </button>
          </form>
        </div>
      )}

      <div style={{ marginTop: "2.5rem" }}>
        <div className="cart-section-head">{labels.cardHeading}</div>
        <p className="care-required-note">{labels.cardNote}</p>
        <form
          method="post"
          action={action}
          onSubmit={(e) => {
            if (!confirm(labels.cardConfirm)) e.preventDefault();
          }}
        >
          <input type="hidden" name="action" value="reauth" />
          <button type="submit" className="btn-ghost">{labels.cardSubmit}</button>
        </form>
      </div>

      <div style={{ marginTop: "2.5rem" }}>
        <div className="cart-section-head">{labels.cancelHeading}</div>
        <p className="care-required-note">
          {labels.cancelNote}
          {committed && <> {labels.cancelCommitted}</>}
        </p>
        <form
          method="post"
          action={action}
          onSubmit={(e) => {
            if (!confirm(labels.cancelConfirm)) e.preventDefault();
          }}
        >
          <input type="hidden" name="action" value="cancel" />
          <button type="submit" className="cart-remove" style={{ color: "#8a3b2a" }}>
            {labels.cancelSubmit}
          </button>
        </form>
      </div>
    </>
  );
}
