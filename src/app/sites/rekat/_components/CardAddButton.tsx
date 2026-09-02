"use client";

import { useEffect, useState } from "react";
import { getBean } from "../_data/beans";
import { twd } from "../_data/shop";
import { useCart } from "./CartProvider";

/**
 * 豆單卡片上的「加入購物車」。
 *
 * 刻意**不彈出購物車抽屜**：這一顆的使用情境是「一路往下逛、看到想要的就丟一包」，
 * 每加一次就被抽屜打斷會很煩。改成按鈕自己變成「已加入 ✓」兩秒，
 * 數量要調整到購物車再說。
 */
export default function CardAddButton({ slug }: { slug: string }) {
  const { add, lines } = useCart();
  const [hit, setHit] = useState(false);
  const bean = getBean(slug);
  const inCart = lines.find((l) => l.slug === slug)?.qty ?? 0;

  useEffect(() => {
    if (!hit) return;
    const t = setTimeout(() => setHit(false), 1800);
    return () => clearTimeout(t);
  }, [hit]);

  if (!bean) return null;

  return (
    <div className="rk-cardbuy">
      {bean.bundle && (
        <span className="rk-cardbuy__promo">
          {bean.bundle.label} {twd(bean.bundle.price)}
        </span>
      )}
      <button
        type="button"
        className={`rk-btn rk-btn--sm ${hit ? "rk-btn--accent" : "rk-btn--solid"}`}
        onClick={() => {
          add(slug, 1, false);
          setHit(true);
        }}
        aria-label={`把${bean.nameZh}加入購物車`}
      >
        {hit ? "已加入 ✓" : "加入購物車"}
        {!hit && inCart > 0 && <em className="rk-cardbuy__n">{inCart}</em>}
      </button>
    </div>
  );
}
