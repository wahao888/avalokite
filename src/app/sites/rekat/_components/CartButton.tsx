"use client";

import { useCart } from "./CartProvider";

/** 導覽列上的購物車鈕。hydration 完成前不顯示數字，避免 SSR 不一致的閃動。 */
export default function CartButton() {
  const { count, ready, setOpen } = useCart();
  const has = ready && count > 0;

  return (
    <button
      type="button"
      className={`rk-cartbtn${has ? " rk-cartbtn--full" : ""}`}
      onClick={() => setOpen(true)}
      aria-label={has ? `購物車，${count} 支` : "購物車"}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M9 7V5.5a3 3 0 0 1 6 0V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <b>{ready ? count : ""}</b>
    </button>
  );
}
