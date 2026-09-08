"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { IconBag } from "./Icons";

export function CartButton() {
  const { count, ready, setOpen, bump } = useCart();
  const [animate, setAnimate] = useState(false);

  // 加入購物車時讓數字跳一下。這是整個站唯一必要的動畫，
  // 因為「加進去了嗎」是連線期間唯一需要即時回饋的動作——
  // 而我們刻意不彈出抽屜（那會打斷她繼續加下一件）。
  //
  // ⚠ bump 是**計數器**不是布林值。必須靠這個 timer 把 class 拿掉再加回去，
  // 否則 class 一直掛著，CSS animation 只會播第一次——第二件之後就沒有回饋了。
  useEffect(() => {
    if (bump === 0) return;
    setAnimate(true);
    const t = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(t);
  }, [bump]);

  return (
    <button
      type="button"
      className="am-cartbtn"
      onClick={() => setOpen(true)}
      aria-label={`購物車${ready && count > 0 ? `（${count} 件）` : ""}`}
    >
      <IconBag size={18} stroke={1.7} />
      <span className="am-navtext">購物車</span>
      {/* ready 之前不顯示數字：伺服器不知道 localStorage 裡有什麼，
          先渲染 0 再跳成 3 會閃一下，而且是 hydration mismatch。 */}
      {ready && count > 0 && (
        <span className={`am-cartbtn__n${animate ? " bump" : ""}`}>{count}</span>
      )}
    </button>
  );
}
