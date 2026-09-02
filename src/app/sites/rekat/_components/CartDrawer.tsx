"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { getBean } from "../_data/beans";
import { FREE_SHIPPING_OVER, twd, type PricedLine } from "../_data/shop";
import { RK } from "../_data/site";
import { useCart } from "./CartProvider";
import BeanArt from "./BeanArt";
import BundleRows, { BundleHint } from "./BundleRows";

/* 側滑購物車。
 * 刻意不做「加入購物車後跳轉到購物車頁」——咖啡豆常常一次買兩三支，
 * 跳走會打斷挑豆的動線。抽屜滑出來、看得到小計、可以直接關掉繼續逛。 */

function Line({ line }: { line: PricedLine }) {
  const { setQty, remove } = useCart();
  const bean = getBean(line.slug);
  if (!bean) return null;

  return (
    <div className="rk-line">
      <div className="rk-line__art">
        <BeanArt bean={bean} compact />
      </div>

      <div>
        <Link className="rk-line__name" href={`${RK}/beans/${bean.slug}`}>
          {bean.nameZh}
        </Link>
        <div className="rk-line__meta">{twd(line.unitPrice)} / 半磅 227g</div>
        {bean.bundle && <BundleHint line={line} bean={bean} />}
        <div className="rk-line__ctl">
          <div className="rk-qty">
            <button type="button" aria-label="減少一包" onClick={() => setQty(line.slug, line.qty - 1)}>
              −
            </button>
            <b>{line.qty}</b>
            <button type="button" aria-label="增加一包" onClick={() => setQty(line.slug, line.qty + 1)}>
              ＋
            </button>
          </div>
          <button className="rk-line__rm" type="button" onClick={() => remove(line.slug)}>
            移除
          </button>
        </div>
      </div>

      <div className="rk-line__amt">{twd(line.amount)}</div>
    </div>
  );
}

export default function CartDrawer() {
  const { open, setOpen, totals, ready } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Esc 關閉；開啟時把焦點移進抽屜，關閉後不留在被 aria-hidden 蓋住的元素上
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open || !ready) return null;

  const empty = totals.lines.length === 0;
  const away = FREE_SHIPPING_OVER - totals.subtotal;

  return (
    <>
      <div className="rk-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        className="rk-drawer"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="購物車"
      >
        <header className="rk-drawer__head">
          <div>
            <span className="rk-eyebrow">Your Cart</span>
            <strong style={{ fontSize: 18, fontWeight: 500 }}>
              購物車{totals.count > 0 ? `・${totals.count} 支` : ""}
            </strong>
          </div>
          <button className="rk-x" type="button" onClick={() => setOpen(false)} ref={closeBtn} aria-label="關閉購物車">
            ✕
          </button>
        </header>

        <div className="rk-drawer__body">
          {empty ? (
            <p className="rk-empty">
              購物車還是空的。
              <br />
              <Link className="rk-link" href={`${RK}/beans`} onClick={() => setOpen(false)}>
                回豆單挑一支
              </Link>
            </p>
          ) : (
            totals.lines.map((l) => <Line key={l.slug} line={l} />)
          )}
        </div>

        {!empty && (
          <footer className="rk-drawer__foot">
            <div className="rk-sum">
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
                <span>運費</span>
                <b>{totals.shippingFee === 0 ? "免運" : twd(totals.shippingFee)}</b>
              </div>
              {away > 0 && (
                <div className="rk-mute" style={{ fontSize: 12 }}>
                  <span>再買 {twd(away)} 免運</span>
                </div>
              )}
              <div className="total">
                <span>合計</span>
                <b>{twd(totals.total)}</b>
              </div>
            </div>

            <Link
              className="rk-btn rk-btn--solid rk-btn--block"
              href={`${RK}/checkout`}
              onClick={() => setOpen(false)}
              style={{ marginTop: 16 }}
            >
              前往結帳
            </Link>
            <p style={{ fontSize: 12, color: "var(--rk-mute)", marginTop: 10, textAlign: "center" }}>
              付款方式：銀行匯款 / ATM・貨到付款
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
