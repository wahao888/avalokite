"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";
import { LINE_STATUS_ZH, twd, MAX_QTY_PER_LINE, type PricedLine } from "../_data/cart";
import { thumbUrl } from "@/lib/media-url";

// 購物車抽屜。
//
// 這裡最重要的一條規則：**已截止／庫存不足的行絕不靜默移除**。
// 她把東西放進購物車時它是開放的；默默拿掉等於在她不知情的狀況下
// 改掉她即將要付的金額。所以那些行留在畫面上、標明原因、附一顆移除鈕，
// 而且在清掉之前不讓她結帳。
//
// 只有「商品已被刪除」的行是靜默丟棄的——那件東西已經不存在，她本來就沒有期待。

function Line({
  line,
  onQty,
  onRemove,
  blocked,
}: {
  line: PricedLine;
  onQty?: (qty: number) => void;
  onRemove: () => void;
  blocked?: boolean;
}) {
  return (
    <div className={`am-line${blocked ? " am-line--blocked" : ""}`}>
      {line.imageKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(line.imageKey)} alt="" width={60} height={60} loading="lazy" />
      ) : (
        <img alt="" width={60} height={60} />
      )}

      <div className="am-line__main">
        <div className="am-line__name">{line.name}</div>
        {line.optionLabel && <div className="am-line__spec">{line.optionLabel}</div>}
        {blocked ? (
          <div className="am-line__spec" style={{ color: "var(--a-accent)" }}>
            {LINE_STATUS_ZH[line.status]}
            {line.status === "oos" && line.stockLeft !== null ? `（剩 ${line.stockLeft}）` : ""}
          </div>
        ) : (
          <div className="am-line__spec">
            {twd(line.unitPrice)} × {line.qty}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.35rem" }}>
          {!blocked && onQty && (
            <div className="am-step">
              <button type="button" aria-label="減少" onClick={() => onQty(line.qty - 1)}>
                －
              </button>
              <span className="am-step__n">{line.qty}</span>
              <button
                type="button"
                aria-label="增加"
                disabled={line.qty >= MAX_QTY_PER_LINE}
                onClick={() => onQty(line.qty + 1)}
              >
                ＋
              </button>
            </div>
          )}
          <button type="button" className="am-copy" onClick={onRemove}>
            移除
          </button>
        </div>
      </div>

      {!blocked && <div className="am-line__amt">{twd(line.amount)}</div>}
    </div>
  );
}

export function CartDrawer() {
  const { open, setOpen, pricing, setQty, remove, count, ready } = useCart();

  // 開啟時鎖住底層捲動，並支援 Esc 關閉
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  if (!open) return null;

  const totals = pricing.state === "ok" ? pricing.totals : null;
  const blocked = totals?.blocked ?? [];
  // 商品被刪除的那種不必特別解釋，其餘一定要讓她看到
  const explain = blocked.filter((b) => b.status !== "gone");
  const canCheckout = Boolean(totals && totals.lines.length > 0 && explain.length === 0);

  return (
    <>
      <button
        className="am-drawer__scrim"
        aria-label="關閉購物車"
        onClick={() => setOpen(false)}
      />
      <aside className="am-drawer" role="dialog" aria-label="購物車">
        <div className="am-drawer__head">
          <h2>購物車{ready && count > 0 ? `（${count}）` : ""}</h2>
          <button type="button" className="am-copy" onClick={() => setOpen(false)}>
            關閉
          </button>
        </div>

        <div className="am-drawer__body">
          {pricing.state === "idle" && <p className="am-empty">購物車是空的。</p>}
          {pricing.state === "loading" && <p className="am-field__hint">計算中…</p>}
          {pricing.state === "error" && (
            <div className="am-err">
              目前無法確認庫存與價格，請檢查網路後重試。
              <br />
              為了避免金額不正確，先暫停結帳。
            </div>
          )}

          {totals?.lines.map((l) => (
            <Line
              key={`${l.productId}:${l.optionId ?? ""}`}
              line={l}
              onQty={(q) => setQty(l.productId, l.optionId, q)}
              onRemove={() => remove(l.productId, l.optionId)}
            />
          ))}

          {explain.length > 0 && (
            <div className="am-blocked">
              <strong>以下商品目前無法下單</strong>
              <p style={{ margin: "0.3rem 0 0.5rem" }}>
                移除後就可以結帳，其餘商品不受影響。
              </p>
              {explain.map((l) => (
                <Line
                  key={`b:${l.productId}:${l.optionId ?? ""}`}
                  line={l}
                  blocked
                  onRemove={() => remove(l.productId, l.optionId)}
                />
              ))}
            </div>
          )}
        </div>

        {totals && totals.lines.length > 0 && (
          <div className="am-drawer__foot">
            <div className="am-total">
              <span>商品小計</span>
              <b>{twd(totals.itemsTotal)}</b>
            </div>
            <p className="am-field__hint" style={{ marginBottom: "0.6rem" }}>
              運費在結單時才計算，同一檔連線下幾次單都只收一次。
            </p>
            <a
              className={`am-btn am-btn--accent am-btn--full${canCheckout ? "" : " am-btn--ghost"}`}
              href={canCheckout ? "/checkout" : undefined}
              aria-disabled={!canCheckout}
              onClick={(e) => {
                if (!canCheckout) e.preventDefault();
              }}
            >
              {canCheckout ? "去結帳" : "請先移除無法下單的商品"}
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
