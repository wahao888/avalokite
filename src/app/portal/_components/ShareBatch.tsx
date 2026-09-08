"use client";

import { lineShareUrl } from "@/lib/line-share";
import { CopyButton } from "./CopyButton";

// Amber 的分享按鈕。開賣、收單提醒都從這裡出去。
//
// 手機上點一下就開 LINE 的「傳送給…」選單，她選群組、按送出，結束。
// 對比「複製 → 切到 LINE → 找群組 → 貼上 → 送出」是一鍵對四步，
// 而她每上一檔連線至少要分享兩次（開賣、快截止）。
// ⚠ text 要是**完整的一則訊息（連結已經在裡面）**。
// 連結該放哪一行是文案的一部分——batchOpenText 就把它放在「👉 直接點連結選購」
// 底下，硬在尾巴再補一次會讓中間空一段、連結出現在莫名其妙的位置。
// （2026-09-07 實測看到的。）
export function ShareBatch({ text, label }: { text: string; label: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
      <a className="p-btn" href={lineShareUrl(text)} target="_blank" rel="noreferrer">
        {label}
      </a>
      {/* 桌機或沒裝 LINE 的退路 */}
      <CopyButton text={text} label="複製文字" />
    </div>
  );
}
