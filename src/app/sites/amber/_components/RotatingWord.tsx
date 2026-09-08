"use client";

import { useEffect, useState } from "react";

// 輪播的單字。目前只用在 hero 的小標：PERSONAL SHOPPING IN 〈KOREA｜JAPAN｜EUROPE〉。
//
// ⚠ 三個字都在 DOM 裡、疊在同一個 grid 格子上，只有目前這個是不透明的。
// 這樣做的兩個理由：
//   ① 不會有版位跳動——格子的寬度是最長那個字，換字時周圍的東西不會被推著跑
//   ② 伺服器與客戶端的第一次 render 都是 index 0，沒有 hydration mismatch
//
// 螢幕閱讀器讀外層的 aria-label 就好（那是一句完整的話），
// 裡面三個 span 一律 aria-hidden——否則會被唸成「韓國日本歐洲」三次。

export function RotatingWord({
  words,
  intervalMs = 2400,
  className,
}: {
  words: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    // 系統設了「減少動態效果」就停在第一個字，不要自己動
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => setI((n) => (n + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className={className ?? "am-rot"} aria-label={words.join("、")}>
      {words.map((w, n) => (
        <span key={w} className={n === i ? "on" : undefined} aria-hidden>
          {w}
        </span>
      ))}
    </span>
  );
}
