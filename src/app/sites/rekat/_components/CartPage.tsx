"use client";

import Link from "next/link";
import { getBean } from "../_data/beans";
import { FREE_SHIPPING_OVER, twd, WHOLE_BEAN_ONLY } from "../_data/shop";
import { RK } from "../_data/site";
import { useCart } from "./CartProvider";
import BeanArt from "./BeanArt";
import BundleRows, { BundleHint } from "./BundleRows";

/** 購物車完整頁。抽屜適合「順手看一眼」，這頁適合「認真整理一下再結帳」。 */
export default function CartPage() {
  const { totals, ready, setQty, remove, clear } = useCart();

  if (!ready) {
    return <p className="rk-empty">讀取購物車…</p>;
  }

  if (totals.lines.length === 0) {
    return (
      <p className="rk-empty">
        購物車還是空的。
        <br />
        <Link className="rk-link" href={`${RK}/beans`}>
          回豆單挑一支
        </Link>
      </p>
    );
  }

  const away = FREE_SHIPPING_OVER - totals.subtotal;

  return (
    <div className="rk-checkout">
      <div>
        {totals.lines.map((l) => {
          const bean = getBean(l.slug);
          if (!bean) return null;
          return (
            <div key={l.slug} className="rk-line" style={{ gridTemplateColumns: "80px minmax(0,1fr) auto" }}>
              <Link href={`${RK}/beans/${bean.slug}`} style={{ width: 80 }}>
                <BeanArt bean={bean} compact />
              </Link>

              <div>
                <Link className="rk-line__name" href={`${RK}/beans/${bean.slug}`} style={{ fontSize: 16 }}>
                  {bean.nameZh}
                </Link>
                <div className="rk-line__meta">
                  NO.{String(bean.no).padStart(2, "0")}・{twd(l.unitPrice)} / 半磅 227g
                </div>

                {bean.bundle && <BundleHint line={l} bean={bean} />}

                <div className="rk-line__ctl">
                  <div className="rk-qty">
                    <button type="button" aria-label="減少一包" onClick={() => setQty(l.slug, l.qty - 1)}>
                      −
                    </button>
                    <b>{l.qty}</b>
                    <button type="button" aria-label="增加一包" onClick={() => setQty(l.slug, l.qty + 1)}>
                      ＋
                    </button>
                  </div>
                  <button className="rk-line__rm" type="button" onClick={() => remove(l.slug)}>
                    移除
                  </button>
                </div>
              </div>

              <div className="rk-line__amt">{twd(l.amount)}</div>
            </div>
          );
        })}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 22, flexWrap: "wrap" }}>
          <Link className="rk-arrow" href={`${RK}/beans`} style={{ color: "var(--rk-accent)" }}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
              <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            繼續選豆
          </Link>
          <button className="rk-line__rm" type="button" onClick={clear}>
            清空購物車
          </button>
        </div>
      </div>

      <aside className="rk-aside">
        <span className="rk-eyebrow">Summary</span>
        <h2 className="rk-h3" style={{ margin: "8px 0 18px" }}>
          小計
        </h2>

        <div className="rk-sum">
          <div>
            <span>品項定價（{totals.count} 包）</span>
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
          <div className="total">
            <span>合計</span>
            <b>{twd(totals.total)}</b>
          </div>
        </div>

        {away > 0 && (
          <p style={{ fontSize: 12.5, color: "var(--rk-mute)", marginTop: 12 }}>
            再買 {twd(away)} 免運。
          </p>
        )}

        <Link className="rk-btn rk-btn--solid rk-btn--block" href={`${RK}/checkout`} style={{ marginTop: 20 }}>
          前往結帳
        </Link>

        <p style={{ fontSize: 12.5, color: "var(--rk-mute)", marginTop: 14, lineHeight: 1.8 }}>
          {WHOLE_BEAN_ONLY}。選擇貨到付款會另加手續費，於下一步顯示。
          訂單確認後才烘焙，約 2–3 個工作天出貨。
        </p>
      </aside>
    </div>
  );
}
