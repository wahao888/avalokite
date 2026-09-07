"use client";

import { useCart } from "./CartProvider";
import { LINE_STATUS_ZH, twd, MAX_QTY_PER_LINE, groupByBatch } from "../_data/cart";
import { thumbUrl } from "@/lib/media-url";
import { batchTone } from "../_data/batch-tone";

// 購物車整頁版。抽屜適合「加完看一眼」，這一頁適合「準備結帳前檢查」——
// 有網址可以分享、有上一頁可以回、在小螢幕上也不會被抽屜擠掉。

export function CartPageView() {
  const { ready, pricing, setQty, remove } = useCart();

  if (!ready) return <p className="am-field__hint">載入中…</p>;

  if (pricing.state === "idle") {
    return (
      <>
        <p className="am-empty">購物車是空的。</p>
        <a className="am-btn am-btn--accent" href="/">
          去逛逛
        </a>
      </>
    );
  }
  if (pricing.state === "loading") return <p className="am-field__hint">計算中…</p>;
  if (pricing.state === "error") {
    return (
      <div className="am-err">
        目前無法確認庫存與價格，請檢查網路後重新整理。為了避免金額不正確，先暫停結帳。
      </div>
    );
  }

  const { totals } = pricing;
  const groups = groupByBatch(totals.lines);
  const explain = totals.blocked.filter((b) => b.status !== "gone");
  const canCheckout = totals.lines.length > 0 && explain.length === 0;

  return (
    <>
      {groups.map((g) => {
        const tone = batchTone(g.batchId, g.batchTone);
        return (
          <section key={g.batchId} className="am-cartgroup">
            {groups.length > 1 && (
              <header className="am-cartgroup__head" style={{ color: tone.ink, borderColor: tone.line }}>
                {g.batchTitle}
              </header>
            )}
            {g.lines.map((l) => (
        <div className="am-line" key={`${l.productId}:${l.optionId ?? ""}`}>
          {l.imageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(l.imageKey)} alt="" width={60} height={60} loading="lazy" />
          ) : (
            <img alt="" width={60} height={60} />
          )}
          <div className="am-line__main">
            <div className="am-line__name">{l.name}</div>
            {l.optionLabel && <div className="am-line__spec">{l.optionLabel}</div>}
            <div className="am-line__spec">{twd(l.unitPrice)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.35rem" }}>
              <div className="am-step">
                <button type="button" aria-label="減少" onClick={() => setQty(l.productId, l.optionId, l.qty - 1)}>
                  －
                </button>
                <span className="am-step__n">{l.qty}</span>
                <button
                  type="button"
                  aria-label="增加"
                  disabled={l.qty >= MAX_QTY_PER_LINE}
                  onClick={() => setQty(l.productId, l.optionId, l.qty + 1)}
                >
                  ＋
                </button>
              </div>
              <button type="button" className="am-copy" onClick={() => remove(l.productId, l.optionId)}>
                移除
              </button>
            </div>
          </div>
          <div className="am-line__amt">{twd(l.amount)}</div>
        </div>
            ))}
            {groups.length > 1 && (
              <div className="am-total" style={{ marginTop: "0.5rem" }}>
                <span>小計</span>
                <b>{twd(g.itemsTotal)}</b>
              </div>
            )}
          </section>
        );
      })}

      {/* 已截止／庫存不足的行留在畫面上，不靜默移除——
          她放進來時是開放的，默默拿掉等於改掉她即將付的金額。 */}
      {explain.length > 0 && (
        <div className="am-blocked">
          <strong>以下商品目前無法下單</strong>
          <p style={{ margin: "0.3rem 0 0.6rem" }}>移除後就可以結帳，其餘商品不受影響。</p>
          {explain.map((l) => (
            <div className="am-line am-line--blocked" key={`b:${l.productId}:${l.optionId ?? ""}`}>
              <div className="am-line__main">
                <div className="am-line__name">
                  {l.name}
                  {l.optionLabel ? `（${l.optionLabel}）` : ""}
                </div>
                <div className="am-line__spec" style={{ color: "var(--a-accent)" }}>
                  {LINE_STATUS_ZH[l.status]}
                  {l.status === "oos" && l.stockLeft !== null ? `（剩 ${l.stockLeft}）` : ""}
                </div>
                <button
                  type="button"
                  className="am-copy"
                  style={{ marginTop: "0.35rem" }}
                  onClick={() => remove(l.productId, l.optionId)}
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.length > 1 && canCheckout && (
        <p className="am-field__hint" style={{ marginTop: "1rem" }}>
          不同連線分開出貨（不同國家、不同時間到台灣），運費各收一次，所以要分開結帳。
        </p>
      )}

      {totals.lines.length > 0 && (
        <div className="am-buybar">
          <div className="am-buybar__sum">
            商品小計
            <b>{twd(totals.itemsTotal)}</b>
          </div>
          {!canCheckout ? (
            <span className="am-btn am-btn--ghost" aria-disabled>
              請先移除無法下單的商品
            </span>
          ) : groups.length === 1 ? (
            <a className="am-btn am-btn--accent" href={`/checkout?b=${encodeURIComponent(groups[0].batchId)}`}>
              去結帳
            </a>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
              {groups.map((g) => (
                <a
                  key={g.batchId}
                  className="am-btn am-btn--accent am-btn--sm"
                  href={`/checkout?b=${encodeURIComponent(g.batchId)}`}
                >
                  結「{g.batchTitle}」 {twd(g.itemsTotal)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
