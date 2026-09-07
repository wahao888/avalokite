"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

// 列表頁的「＋1」。
//
// 連線期間客人是一路狂加，不該每一件都要先進商品頁。所以**沒有規格的商品
// 在列表上直接加得進去**；有規格的則導到商品頁去選（lemai 也是這樣，
// 而且是對的——在 155px 寬的卡片裡塞一組規格晶片只會兩邊都做不好）。

export function QuickAdd({ productId }: { productId: string }) {
  const { add } = useCart();
  const [hit, setHit] = useState(false);

  return (
    <button
      type="button"
      className={`am-btn am-btn--sm am-btn--full${hit ? "" : " am-btn--accent"}`}
      onClick={() => {
        add(productId, null, 1);
        setHit(true);
        setTimeout(() => setHit(false), 1200);
      }}
    >
      {hit ? "已加入 ✓" : "＋1"}
    </button>
  );
}
