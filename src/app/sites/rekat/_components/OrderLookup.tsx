"use client";

import { useState } from "react";
import Link from "next/link";
import { BANK, bankReady, isPayment, needsPaymentReport, twd } from "../_data/shop";
import { RK, SITE } from "../_data/site";

type Item = { name: string; grindLabel: string; qty: number; freeQty: number; amount: number };
type Order = {
  id: string;
  status: string;
  statusZh: string;
  paymentZh: string;
  payment: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  items: Item[];
  remitLast5: string | null;
  remitAt: string | null;
  createdAt: string;
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(iso));

/**
 * 訂單查詢與匯款回報。
 * 需要「訂單編號 + 下單電話」兩者相符——包裹上印著編號，光有編號不該看得到訂購資料。
 */
export default function OrderLookup() {
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [last5, setLast5] = useState("");
  const [remitName, setRemitName] = useState("");
  const [remitMsg, setRemitMsg] = useState<string | null>(null);
  const [remitErr, setRemitErr] = useState<string | null>(null);
  const [remitBusy, setRemitBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOrder(null);
    setRemitMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rekat/order/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, phone }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== "object" || !("order" in data)) {
        setErr(
          res.status === 429
            ? "查詢太頻繁，請稍等幾分鐘再試。"
            : "查不到這張訂單。請確認訂單編號與下單時填的電話是否一致。",
        );
      } else {
        setOrder((data as { order: Order }).order);
      }
    } catch {
      setErr("連線出了問題，請再試一次。");
    }
    setBusy(false);
  }

  async function remit(e: React.FormEvent) {
    e.preventDefault();
    setRemitErr(null);
    setRemitMsg(null);
    setRemitBusy(true);
    try {
      const res = await fetch("/api/rekat/order/remit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, phone, last5, remitName }),
      });
      if (res.ok) {
        setRemitMsg("已收到你的付款回報，我們核對後會安排出貨。");
        setOrder((o) => (o ? { ...o, remitLast5: last5, remitAt: new Date().toISOString() } : o));
      } else {
        setRemitErr("回報失敗，請確認末五碼是 5 位數字，或直接來電 " + SITE.phoneDisplay + "。");
      }
    } catch {
      setRemitErr("連線出了問題，請再試一次。");
    }
    setRemitBusy(false);
  }

  return (
    <div className="rk-checkout">
      <div>
        <form onSubmit={lookup} style={{ maxWidth: 460 }}>
          <div className="rk-fields">
            <label className="rk-field">
              <span>
                訂單編號 <b>*</b>
              </span>
              <input
                className="rk-input"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
                maxLength={40}
                placeholder="RK260901-K7QX"
                autoComplete="off"
                style={{ fontFamily: "var(--rk-mono)", letterSpacing: "0.06em" }}
              />
            </label>
            <label className="rk-field">
              <span>
                下單時填的手機 <b>*</b>
              </span>
              <input
                className="rk-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={30}
                inputMode="tel"
                placeholder="0912-345-678"
              />
            </label>
          </div>

          <button className="rk-btn rk-btn--solid" type="submit" disabled={busy} style={{ marginTop: 20 }}>
            {busy ? "查詢中…" : "查詢訂單"}
          </button>

          {err && (
            <p className="rk-alert" style={{ marginTop: 18 }} role="alert">
              {err}
            </p>
          )}
        </form>

        {order && (
          <div style={{ marginTop: 40 }}>
            <hr className="rk-rule" />

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 28 }}>
              <div>
                <span className="rk-eyebrow">Order</span>
                <p className="rk-num" style={{ fontSize: 22, letterSpacing: "0.08em", marginTop: 4 }}>
                  {order.id}
                </p>
                <p className="rk-mute" style={{ fontSize: 13 }}>
                  {fmt(order.createdAt)} 成立
                </p>
              </div>
              <span className={`rk-tag ${order.status === "shipped" || order.status === "done" ? "rk-tag--solid" : ""}`}>
                {order.statusZh}
              </span>
            </div>

            <dl className="rk-spec" style={{ marginTop: 26 }}>
              {order.items.map((it, i) => (
                <div key={i}>
                  <dt style={{ fontFamily: "var(--rk-han)", fontSize: 13, textTransform: "none", letterSpacing: 0 }}>
                    × {it.qty}
                    {it.freeQty > 0 ? `（贈 ${it.freeQty}）` : ""}
                  </dt>
                  <dd>
                    {it.name}
                    <br />
                    <small>
                      {it.grindLabel}　{twd(it.amount)}
                    </small>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="rk-sum" style={{ marginTop: 20, maxWidth: 320 }}>
              <div>
                <span>小計</span>
                <b>{twd(order.subtotal)}</b>
              </div>
              <div>
                <span>運費</span>
                <b>{order.shippingFee === 0 ? "免運" : twd(order.shippingFee)}</b>
              </div>
              <div className="total">
                <span>應付（{order.paymentZh}）</span>
                <b>{twd(order.total)}</b>
              </div>
            </div>

            {/* 付款回報：只有匯款需要，貨到付款不需要（錢當面給宅配） */}
            {isPayment(order.payment) && needsPaymentReport(order.payment) && (
              <div style={{ marginTop: 34 }}>
                <span className="rk-eyebrow">Payment</span>
                <h2 className="rk-h3" style={{ marginTop: 6, marginBottom: 12 }}>
                  回報匯款
                </h2>

                {order.remitAt ? (
                  <p className="rk-alert rk-alert--ok">
                    已於 {fmt(order.remitAt)} 回報末五碼 <b className="rk-num">{order.remitLast5}</b>。
                    我們核對後會安排出貨。
                  </p>
                ) : (
                  <form onSubmit={remit} style={{ maxWidth: 460 }}>
                    <div className="rk-fields rk-fields--2">
                      <label className="rk-field">
                        <span>
                          匯款帳號末五碼 <b>*</b>
                        </span>
                        <input
                          className="rk-input"
                          value={last5}
                          onChange={(e) => setLast5(e.target.value.replace(/\D/g, "").slice(0, 5))}
                          required
                          inputMode="numeric"
                          pattern="\d{5}"
                          placeholder="12345"
                          style={{ fontFamily: "var(--rk-mono)", letterSpacing: "0.14em" }}
                        />
                      </label>
                      <label className="rk-field">
                        <span>付款人姓名（選填）</span>
                        <input
                          className="rk-input"
                          value={remitName}
                          onChange={(e) => setRemitName(e.target.value)}
                          maxLength={60}
                        />
                      </label>
                    </div>
                    <button className="rk-btn rk-btn--accent" type="submit" disabled={remitBusy} style={{ marginTop: 18 }}>
                      {remitBusy ? "送出中…" : "送出回報"}
                    </button>
                    {remitErr && (
                      <p className="rk-alert" style={{ marginTop: 16 }} role="alert">
                        {remitErr}
                      </p>
                    )}
                    {remitMsg && (
                      <p className="rk-alert rk-alert--ok" style={{ marginTop: 16 }}>
                        {remitMsg}
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="rk-aside">
        <span className="rk-eyebrow">Help</span>
        <h2 className="rk-h3" style={{ margin: "8px 0 14px" }}>
          找不到訂單？
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--rk-ink-2)" }}>
          訂單編號是下單完成頁上那組 <span className="rk-num">RK</span> 開頭的字串，
          英文字母不分大小寫。電話要跟下單時填的那一支一樣。
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.9, color: "var(--rk-ink-2)", marginTop: 14 }}>
          兩者都對還是查不到，直接打給我們：
          <a className="rk-link" href={`tel:${SITE.phoneTel}`} style={{ marginLeft: 4 }}>
            {SITE.phoneDisplay}
          </a>
        </p>

        {bankReady() && (
          <div className="rk-bank" style={{ marginTop: 20 }}>
            <span className="rk-eyebrow" style={{ marginBottom: 10 }}>
              匯款資訊
            </span>
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
                <dd>{BANK.account}</dd>
              </div>
              <div>
                <dt>戶名</dt>
                <dd>{BANK.accountName}</dd>
              </div>
            </dl>
          </div>
        )}

        <p style={{ marginTop: 22 }}>
          <Link className="rk-link" href={`${RK}/beans`}>
            回本期豆單
          </Link>
        </p>
      </aside>
    </div>
  );
}
