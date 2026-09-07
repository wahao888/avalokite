"use client";

import { useState } from "react";
import { twd } from "../_data/cart";

type OrderResult = {
  kind: "order";
  id: string;
  itemsTotal: number;
  items: { name: string; optionLabel: string | null; qty: number; amount: number; statusZh: string; gotQty: number | null }[];
  settlementUrl: string | null;
};
type SettlementResult = { kind: "settlement"; url: string; id: string; payable: number };

export function OrderLookup() {
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | SettlementResult | null>(null);

  const submit = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/amber/order/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, phone }),
      });
      if (res.status === 404) {
        // 查無此編號與電話不符回同一個訊息——不讓這頁變成編號探測器
        setError("查不到符合的訂單。請確認編號與下單時填的手機號碼。");
        return;
      }
      if (!res.ok) {
        setError("查詢失敗，請稍後再試。");
        return;
      }
      const data = (await res.json()) as OrderResult | SettlementResult;
      // 結單有專屬頁面（有應付金額與匯款資訊），直接帶過去
      if (data.kind === "settlement") {
        location.href = data.url;
        return;
      }
      setResult(data);
    } catch {
      setError("網路不穩，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="am-field">
        <label htmlFor="l-id">訂單或結單編號</label>
        <input
          id="l-id"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="AM260920-K7QX"
          autoCapitalize="characters"
        />
      </div>
      <div className="am-field">
        <label htmlFor="l-phone">下單時填的手機</label>
        <input
          id="l-phone"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912345678"
        />
      </div>

      {error && <div className="am-err">{error}</div>}

      <button
        type="button"
        className="am-btn am-btn--accent am-btn--full"
        disabled={busy || !id.trim() || !phone.trim()}
        onClick={() => void submit()}
      >
        {busy ? "查詢中…" : "查詢"}
      </button>

      {result?.kind === "order" && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 className="am-h1" style={{ fontSize: "1.1rem" }}>
            訂單 {result.id}
          </h2>
          <div className="am-sum">
            {result.items.map((it, i) => (
              <div className="am-sum__row" key={i}>
                <span>
                  {it.name}
                  {it.optionLabel ? `（${it.optionLabel}）` : ""} ×{it.qty}
                  {it.gotQty !== null && it.gotQty < it.qty ? `（買到 ${it.gotQty}）` : ""}
                  {it.statusZh !== "待採購" ? `　${it.statusZh}` : ""}
                </span>
                <span>{twd(it.amount)}</span>
              </div>
            ))}
            <div className="am-sum__row am-sum__row--total">
              <span>商品小計</span>
              <span>{twd(result.itemsTotal)}</span>
            </div>
          </div>

          {result.settlementUrl ? (
            <a
              className="am-btn am-btn--accent am-btn--full"
              style={{ marginTop: "1rem" }}
              href={result.settlementUrl}
            >
              看結單與應付金額
            </a>
          ) : (
            <p className="am-field__hint" style={{ marginTop: "0.8rem" }}>
              這一檔還在收單中，結單後會通知你總金額與匯款方式。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
