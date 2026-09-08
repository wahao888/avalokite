"use client";

import { useEffect, useState } from "react";
import { IconReceipt } from "./Icons";

// 頁首的「我的訂單」。
//
// 客人第一次下單後，他的專屬連結會存進這台裝置的 localStorage，
// 之後頁首直接出現入口——同一支手機根本不用點那條連結，也不用記編號。
// 換裝置時才需要用到那條連結本身（或「編號＋手機」的備援路徑）。
//
// ⚠ 掛載前不渲染。伺服器不知道 localStorage 裡有什麼，
// 先畫出來再消失會閃一下，而且是 hydration mismatch。

export const MY_KEY = "amber.me.v1";

export function rememberMyLink(path: string) {
  try {
    localStorage.setItem(MY_KEY, path);
  } catch {
    /* 無痕模式，忽略——那條連結客人手上還是有 */
  }
}

export function MyOrdersLink() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(MY_KEY);
      // 只接受自家的相對路徑，避免有人往 localStorage 塞一個外部網址
      if (v && /^\/me\/[A-Za-z0-9_-]{10,}$/.test(v)) setPath(v);
    } catch {
      /* 忽略 */
    }
  }, []);

  // 下過單的人 → 直接進自己的頁；沒下過的 → 查訂單。
  // 兩個都放的話標誌變寬之後導覽列會擠到換行，而且對已下單的人來說
  // 「查訂單」是多餘的（她自己的頁面裡就有查詢連結）。
  if (!path)
    return (
      <a href="/order/lookup">
        <IconReceipt size={18} stroke={1.7} />
        <span className="am-navtext">查訂單</span>
      </a>
    );
  return (
    <a href={path}>
      <IconReceipt size={18} stroke={1.7} />
      <span className="am-navtext">我的訂單</span>
    </a>
  );
}
