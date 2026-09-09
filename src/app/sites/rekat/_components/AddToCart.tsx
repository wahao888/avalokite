"use client";

import { useState } from "react";
import { twd, WHOLE_BEAN_ONLY } from "../_data/shop";
import type { Bean } from "../_data/beans";
import { useCart } from "./CartProvider";

/** 單品頁的購買區。本店只出原豆，所以沒有研磨度可選——只要決定買幾包。 */
export default function AddToCart({ bean }: { bean: Bean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div className="rk-buy">
      <div className="rk-field">
        <span>數量（半磅 / 227G）</span>
        <div className="rk-qty">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="減少一包">
            −
          </button>
          <b>{qty}</b>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="增加一包">
            ＋
          </button>
        </div>
      </div>


      <div className="rk-buy__row" style={{ marginTop: 20 }}>
        <div className="rk-price">
          {twd(bean.price * qty)}
          <small>
            {qty > 1 ? `${twd(bean.price)} × ${qty} 包` : "每半磅 227g"}
          </small>
        </div>
        <button type="button" className="rk-btn rk-btn--solid" onClick={() => add(bean.slug, qty)}>
          加入購物車
        </button>
      </div>

      <p className="rk-buy__note">
        {WHOLE_BEAN_ONLY}。訂單確認後才烘焙，約 2–3 個工作天出貨。
        付款方式：銀行匯款 / ATM 轉帳、貨到付款。
      </p>
    </div>
  );
}
