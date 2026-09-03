"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BANK,
  bankReady,
  FREE_SHIPPING_OVER,
  needsPaymentReport,
  PAYMENT,
  priceCart,
  twd,
  type PaymentKey,
} from "../_data/shop";
import { RK, SITE } from "../_data/site";
import CopyField from "./CopyField";
import { useCart } from "./CartProvider";
import BundleRows from "./BundleRows";

type Done = { id: string; total: number; payment: PaymentKey };

export default function CheckoutForm() {
  const { lines, totals: cartTotals, ready, clear } = useCart();
  const [payment, setPayment] = useState<PaymentKey>("transfer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  // 選了貨到付款才加手續費，所以總額要跟著付款方式重算
  const totals = useMemo(() => priceCart(lines, payment), [lines, payment]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/rekat/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines,
          payment,
          name: String(fd.get("name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          email: String(fd.get("email") ?? ""),
          address: String(fd.get("address") ?? ""),
          note: String(fd.get("note") ?? ""),
          website: String(fd.get("website") ?? ""),
        }),
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok || !data || typeof data !== "object" || !("id" in data)) {
        // 409 = 購物車裡有豆子在下單前被店家標為售完或下架
        const gone =
          res.status === 409 && data && typeof data === "object" && "items" in data
            ? (data as { items?: unknown }).items
            : null;
        setErr(
          Array.isArray(gone) && gone.length > 0
            ? `${gone.join("、")}目前無法訂購（本期售完或已下架）。請先從購物車移除再送出。`
            : res.status === 429
              ? "送出太頻繁，請稍等幾分鐘再試。"
              : "訂單送出失敗，請再試一次，或直接來電 " + SITE.phoneDisplay + "。",
        );
        setBusy(false);
        return;
      }

      const d = data as { id: string; total: number; payment: PaymentKey };
      // 成功之後才清購物車：失敗時客人不必重新加一次
      clear();
      setDone({ id: d.id, total: d.total, payment: d.payment });
    } catch {
      setErr("網路連線出了問題，訂單沒有送出。請再試一次，或來電 " + SITE.phoneDisplay + "。");
      setBusy(false);
    }
  }

  // ── 完成畫面 ──────────────────────────────────────────────
  if (done) {
    return (
      <div className="rk-wrap rk-wrap--narrow" style={{ paddingBlock: "clamp(32px, 5vw, 60px)" }}>
        <div className="rk-receipt">
          <span className="rk-eyebrow">Order Received・訂單已送出</span>
          <p className="rk-receipt__no">{done.id}</p>
          <p style={{ marginTop: 14, fontSize: 15.5, lineHeight: 1.9, color: "var(--rk-ink-2)" }}>
            應付金額 <b className="rk-num" style={{ color: "var(--rk-ink)" }}>{twd(done.total)}</b>
            　付款方式：{PAYMENT.find((p) => p.key === done.payment)?.label}
          </p>
          <p style={{ marginTop: 10, fontSize: 14, color: "var(--rk-mute)" }}>
            請記下這個編號。查詢進度與回報匯款都需要「訂單編號 + 下單電話」。
          </p>

          {done.payment === "transfer" && (
            <div className="rk-bank">
              <span className="rk-eyebrow" style={{ marginBottom: 10 }}>
                匯款資訊
              </span>
              {bankReady() ? (
                <dl>
                  <div>
                    <dt>銀行</dt>
                    <dd>
                      {BANK.bankName}
                      {BANK.bankCode ? `（${BANK.bankCode}）` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>帳號</dt>
                    <dd>
                      <CopyField value={BANK.account!} label="帳號" />
                    </dd>
                  </div>
                  <div>
                    <dt>戶名</dt>
                    <dd>{BANK.accountName}</dd>
                  </div>
                  <div>
                    <dt>金額</dt>
                    <dd>{twd(done.total)}</dd>
                  </div>
                </dl>
              ) : (
                <p style={{ fontSize: 14, lineHeight: 1.9 }}>
                  我們會盡快以電話或簡訊提供匯款帳號。
                  也可以直接來電 <a className="rk-link" href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a> 詢問。
                </p>
              )}
            </div>
          )}

          <ol className="rk-steps">
            <li>我們收到訂單後會與你確認品項與金額。</li>
            {needsPaymentReport(done.payment) ? (
              <li>
                完成轉帳後，到
                <Link className="rk-link" href={`${RK}/order/lookup`} style={{ margin: "0 4px" }}>
                  訂單查詢
                </Link>
                填寫帳號末五碼，我們核對後安排出貨。
              </li>
            ) : (
              <li>宅配到府時直接付現給宅配人員，不另收手續費。</li>
            )}
            <li>訂單確認後才進滾筒烘焙，約 2–3 個工作天出貨。</li>
          </ol>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
            <Link className="rk-btn rk-btn--solid" href={`${RK}/order/lookup`}>
              查詢這張訂單
            </Link>
            <Link className="rk-btn rk-btn--quiet" href={`${RK}/beans`}>
              回豆單
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) return <p className="rk-empty">讀取購物車…</p>;

  if (cartTotals.lines.length === 0) {
    return (
      <p className="rk-empty">
        購物車是空的，還不能結帳。
        <br />
        <Link className="rk-link" href={`${RK}/beans`}>
          回豆單挑一支
        </Link>
      </p>
    );
  }

  // ── 表單 ──────────────────────────────────────────────────
  return (
    <form className="rk-checkout" onSubmit={submit} noValidate={false}>
      <div style={{ display: "grid", gap: 34 }}>
        <fieldset className="rk-fieldset">
          <legend>收件資料</legend>
          <div className="rk-fields rk-fields--2">
            <label className="rk-field">
              <span>
                姓名 <b>*</b>
              </span>
              <input className="rk-input" name="name" required maxLength={60} autoComplete="name" />
            </label>
            <label className="rk-field">
              <span>
                手機 <b>*</b>
              </span>
              <input
                className="rk-input"
                name="phone"
                required
                maxLength={30}
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912-345-678"
              />
            </label>
          </div>

          <label className="rk-field" style={{ marginTop: 18 }}>
            <span>Email（選填，用來寄訂單確認）</span>
            <input className="rk-input" name="email" type="email" maxLength={200} autoComplete="email" />
          </label>

          <label className="rk-field" style={{ marginTop: 18 }}>
            <span>
              宅配地址 <b>*</b>
            </span>
            <input
              className="rk-input"
              name="address"
              required
              maxLength={200}
              autoComplete="street-address"
              placeholder="含郵遞區號，例：950 台東縣鹿野鄉…"
            />
          </label>

          <label className="rk-field" style={{ marginTop: 18 }}>
            <span>備註（選填）</span>
            <textarea
              className="rk-textarea"
              name="note"
              maxLength={1000}
              placeholder="例：希望某一支再淺一點、指定到貨時段、送禮需求…"
            />
          </label>

          {/* honeypot：真人看不到，機器人會填 */}
          <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
            <label>
              網站
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </fieldset>

        <fieldset className="rk-fieldset">
          <legend>付款方式</legend>
          <div className="rk-radios">
            {PAYMENT.map((p) => (
              <label key={p.key} className="rk-radio">
                <input
                  type="radio"
                  name="payment"
                  value={p.key}
                  checked={payment === p.key}
                  onChange={() => setPayment(p.key)}
                />
                <span style={{ display: "block" }}>
                  <b>{p.label}</b>
                  <span>{p.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="rk-caveat" style={{ marginTop: 14 }}>
            目前不提供線上刷卡。本站不會收集也不會經手任何信用卡或金融帳號資料。
          </p>
        </fieldset>
      </div>

      <aside className="rk-aside">
        <span className="rk-eyebrow">Order Summary</span>
        <h2 className="rk-h3" style={{ margin: "8px 0 16px" }}>
          訂單明細
        </h2>

        <div style={{ display: "grid", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--rk-line)" }}>
          {totals.lines.map((l) => (
            <div key={l.slug} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                {l.name}
                <br />
                <span className="rk-mute" style={{ fontSize: 11.5 }}>
                  原豆 × {l.qty} 包
                </span>
              </span>
              <span className="rk-num" style={{ fontSize: 13.5 }}>
                {twd(l.amount)}
              </span>
            </div>
          ))}
        </div>

        <div className="rk-sum" style={{ marginTop: 16 }}>
          <div>
            <span>品項定價</span>
            <b>{twd(totals.listTotal)}</b>
          </div>
          <BundleRows bundles={totals.bundles} />
          <div>
            <span>小計</span>
            <b>{twd(totals.subtotal)}</b>
          </div>
          <div>
            <span>運費{totals.shippingFee === 0 ? `（滿 ${twd(FREE_SHIPPING_OVER)}）` : ""}</span>
            <b>{totals.shippingFee === 0 ? "免運" : twd(totals.shippingFee)}</b>
          </div>
          <div className="total">
            <span>應付</span>
            <b>{twd(totals.total)}</b>
          </div>
        </div>

        {err && (
          <p className="rk-alert" style={{ marginTop: 16 }} role="alert">
            {err}
          </p>
        )}

        <button className="rk-btn rk-btn--solid rk-btn--block" type="submit" disabled={busy} style={{ marginTop: 18 }}>
          {busy ? "送出中…" : "送出訂單"}
        </button>

        <p style={{ fontSize: 12, color: "var(--rk-mute)", marginTop: 12, lineHeight: 1.8 }}>
          送出後不會立即扣款。我們會與你確認品項與金額，確認後才烘焙出貨。
        </p>
      </aside>
    </form>
  );
}
