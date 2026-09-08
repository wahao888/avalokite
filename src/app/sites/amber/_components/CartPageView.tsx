"use client";

import { useCart } from "./CartProvider";
import { LINE_STATUS_ZH, twd, MAX_QTY_PER_LINE, groupByBatch } from "../_data/cart";
import { thumbUrl } from "@/lib/media-url";
import { batchTone } from "../_data/batch-tone";
import {
  IconAlert,
  IconArrowRight,
  IconBag,
  IconBox,
  IconCalendar,
  IconClose,
  IconMinus,
  IconPlus,
} from "./Icons";

// 購物車整頁版。抽屜適合「加完看一眼」，這一頁適合「準備結帳前檢查」——
// 有網址可以分享、有上一頁可以回、在小螢幕上也不會被抽屜擠掉。
//
// 桌機是雙欄：左邊清單、右邊固定的金額欄。手機仍是單欄 ＋ 黏在底部的
// 結帳列（.am-buybar 的預設樣式），因為那才是拇指構得到的地方。

export function CartPageView() {
  const { ready, lines, pricing, setQty, remove } = useCart();

  if (!ready) return <p className="am-field__hint">載入中…</p>;

  // ⚠ 「購物車是空的」看的是 lines，不是 pricing。
  // pricing 一開始一定是 idle（還沒問過價），而問價要一次網路往返——
  // 用 idle 判斷空車，等於讓一位車裡有三件東西的客人在 4G 上
  // 先看到一秒鐘的「購物車是空的。去逛逛」。
  if (lines.length === 0) {
    return (
      <>
        <p className="am-empty">
          <IconBag size={34} stroke={1.3} className="am-i am-empty__i" />
          購物車是空的。
        </p>
        <div className="am-btns" style={{ justifyContent: "center", marginTop: "1rem" }}>
          <a className="am-btn am-btn--accent" href="/">
            去逛逛
            <IconArrowRight size={17} stroke={2} />
          </a>
        </div>
      </>
    );
  }
  // 車裡有東西但價格還沒回來（含 idle：debounce 還沒觸發）
  if (pricing.state !== "ok" && pricing.state !== "error")
    return <p className="am-field__hint">計算中…</p>;
  if (pricing.state === "error") {
    return (
      <div className="am-err">
        <IconAlert size={18} stroke={1.9} />
        <span>
          目前無法確認庫存與價格，請檢查網路後重新整理。為了避免金額不正確，先暫停結帳。
        </span>
      </div>
    );
  }

  const { totals } = pricing;
  const groups = groupByBatch(totals.lines);
  const explain = totals.blocked.filter((b) => b.status !== "gone");
  const canCheckout = totals.lines.length > 0 && explain.length === 0;

  return (
    <div className="am-cols">
      <div>
        {groups.map((g) => {
          const tone = batchTone(g.batchId, g.batchTone);
          return (
            <section key={g.batchId} className="am-cartgroup">
              {groups.length > 1 && (
                <header
                  className="am-cartgroup__head"
                  style={{ color: tone.ink, borderColor: tone.line }}
                >
                  <IconCalendar size={14} stroke={2} />
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
                    <div className="am-line__row">
                      <div className="am-step">
                        <button
                          type="button"
                          aria-label="減少"
                          onClick={() => setQty(l.productId, l.optionId, l.qty - 1)}
                        >
                          <IconMinus size={16} stroke={2} />
                        </button>
                        <span className="am-step__n">{l.qty}</span>
                        <button
                          type="button"
                          aria-label="增加"
                          disabled={l.qty >= MAX_QTY_PER_LINE}
                          onClick={() => setQty(l.productId, l.optionId, l.qty + 1)}
                        >
                          <IconPlus size={16} stroke={2} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="am-copy"
                        onClick={() => remove(l.productId, l.optionId)}
                      >
                        <IconClose size={14} stroke={2} />
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
            <div className="am-blocked__h">
              <IconAlert size={16} stroke={2} />
              以下商品目前無法下單
            </div>
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
                    <IconClose size={14} stroke={2} />
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="am-cols__side">
        {totals.lines.length > 0 && (
          <div className="am-buybar">
            <div className="am-buybar__sum">
              商品小計
              <b>{twd(totals.itemsTotal)}</b>
            </div>

            {!canCheckout ? (
              <span className="am-btn am-btn--ghost" aria-disabled="true">
                請先移除無法下單的商品
              </span>
            ) : groups.length === 1 ? (
              <a
                className="am-btn am-btn--accent"
                href={`/checkout?b=${encodeURIComponent(groups[0].batchId)}`}
              >
                去結帳
                <IconArrowRight size={17} stroke={2} />
              </a>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
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

            <p className="am-field__hint">
              <IconBox size={14} stroke={1.9} />{" "}
              {groups.length > 1
                ? "不同連線分開出貨（不同國家、不同時間到台灣），運費各收一次，所以要分開結帳。"
                : "運費在結單時才計算，同一檔連線下幾次單都只收一次。"}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
