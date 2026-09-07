"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { twd, MAX_QTY_PER_LINE } from "../_data/cart";

export type OptionView = {
  id: string;
  label: string;
  /** null = 用商品的價格 */
  price: number | null;
  /** null = 不限量 */
  stock: number | null;
};

// 商品頁的購買區：規格 → 數量 → 加入購物車。
//
// 「請選擇規格」在還沒選之前是停用的（lemai 也是這樣，而且是對的：
// 一個按下去才告訴你少填東西的按鈕，等於多一次往返）。

export function AddToCart({
  productId,
  options,
  basePrice,
  axis,
  canOrder,
  closedLabel,
  preorder,
  showStock,
  productStock,
}: {
  productId: string;
  options: OptionView[];
  basePrice: number;
  axis: string | null;
  /** 由伺服器判定。客戶端不會把一個關閉的商品變成開放的 */
  canOrder: boolean;
  closedLabel: string;
  preorder: boolean;
  showStock: boolean;
  productStock: number | null;
}) {
  const { add, setOpen } = useCart();
  const [optionId, setOptionId] = useState<string | null>(options.length === 0 ? null : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const chosen = options.find((o) => o.id === optionId) ?? null;
  const unitPrice = chosen?.price ?? basePrice;
  const stock = options.length > 0 ? (chosen?.stock ?? null) : productStock;

  // 預購商品跳過庫存判斷——那正是「允許預購」的意思
  const soldOut = !preorder && stock !== null && stock <= 0;
  const needsChoice = options.length > 0 && !optionId;
  const max = preorder || stock === null ? MAX_QTY_PER_LINE : Math.min(stock, MAX_QTY_PER_LINE);

  const disabled = !canOrder || needsChoice || soldOut;

  const onAdd = () => {
    if (disabled) return;
    add(productId, optionId, Math.min(qty, max));
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div>
      {options.length > 0 && (
        <div className="am-field">
          <label>{axis ?? "規格"}</label>
          <div className="am-specs">
            {options.map((o) => {
              const out = !preorder && o.stock !== null && o.stock <= 0;
              return (
                <button
                  key={o.id}
                  type="button"
                  className="am-spec"
                  aria-pressed={optionId === o.id}
                  disabled={out}
                  onClick={() => {
                    setOptionId(o.id);
                    setQty(1);
                  }}
                >
                  {o.label}
                  {o.price != null && o.price !== basePrice ? ` ${twd(o.price)}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="am-field">
        <label>數量</label>
        <div className="am-step">
          <button
            type="button"
            aria-label="減少數量"
            disabled={qty <= 1}
            onClick={() => setQty((n) => Math.max(1, n - 1))}
          >
            －
          </button>
          <span className="am-step__n">{qty}</span>
          <button
            type="button"
            aria-label="增加數量"
            disabled={qty >= max}
            onClick={() => setQty((n) => Math.min(max, n + 1))}
          >
            ＋
          </button>
        </div>
        {showStock && stock !== null && (
          <p className="am-field__hint">剩 {stock} 件{preorder ? "（可預購）" : ""}</p>
        )}
      </div>

      <div className="am-buybar">
        <div className="am-buybar__sum">
          小計
          <b>{twd(unitPrice * qty)}</b>
        </div>
        <button
          type="button"
          className="am-btn am-btn--accent"
          disabled={disabled}
          onClick={onAdd}
        >
          {!canOrder
            ? closedLabel
            : soldOut
              ? "已售完"
              : needsChoice
                ? `請選擇${axis ?? "規格"}`
                : added
                  ? "已加入 ✓"
                  : "加入購物車"}
        </button>
      </div>

      {added && (
        <p className="am-field__hint" style={{ textAlign: "center", marginTop: "0.5rem" }}>
          可以繼續逛，
          <button type="button" className="am-copy" onClick={() => setOpen(true)}>
            看購物車
          </button>
        </p>
      )}
    </div>
  );
}
