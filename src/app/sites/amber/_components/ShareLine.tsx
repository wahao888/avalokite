"use client";

import { useState } from "react";
import { lineShareUrl } from "@/lib/line-share";

// 分享到 LINE。
//
// 手機上點一下就開 LINE 的「傳送給…」選單——對比「複製 → 切到 LINE →
// 找群組 → 貼上 → 送出」是一鍵對四步。Amber 每上一檔要分享一次，
// 她的客人每拿到一條「我的訂單」連結也可能要傳給自己，所以這顆按鈕
// 省下來的時間是累積的。
//
// 桌機上會開 line.me 的網頁版；沒有安裝 LINE 的人退回複製，所以旁邊
// 一定要有一顆純複製鈕當退路。

export function ShareLine({
  text,
  url,
  label = "分享到 LINE",
  className = "am-btn am-btn--ghost",
}: {
  text: string;
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <a className={className} href={lineShareUrl(text, url)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

/** 純複製退路。LINE 內建瀏覽器與舊 iOS 可能擋 clipboard，所以再退一層 textarea */
export function ShareCopy({
  text,
  url,
  label = "複製連結",
  className = "am-btn am-btn--ghost",
}: {
  text?: string;
  url: string;
  label?: string;
  /** 它是該區塊唯一的動作時要用 accent——ghost 在深色模式下幾乎看不見 */
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "manual">("idle");
  const payload = text ? `${text}\n${url}` : url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setState("ok");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("manual");
    }
  };

  if (state === "manual") {
    return (
      <textarea
        readOnly
        rows={2}
        value={payload}
        style={{ width: "100%" }}
        onFocus={(e) => e.currentTarget.select()}
        autoFocus
      />
    );
  }

  return (
    <button type="button" className={className} onClick={() => void copy()}>
      {state === "ok" ? "已複製 ✓" : label}
    </button>
  );
}
