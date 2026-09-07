"use client";

import { useState } from "react";

// 一鍵複製通知文字。
//
// 第一期不接 LINE 推播，所以這顆按鈕就是**唯一的對外通道**：
// 後台產生文字 → 她點一下 → 切到 LINE → 貼上 → 下一位。
// 20 個客人大約兩分鐘。
//
// 複製後按鈕會維持「已複製 ✓」不還原——那個狀態就是她的進度條，
// 讓她知道自己貼到第幾個了。重新整理才會清掉。
//
// LINE 的內建瀏覽器與舊版 iOS 可能擋掉 clipboard API，所以一定要有退路：
// 失敗時展開一個自動全選的 textarea 讓她長按拷貝。

export function CopyButton({
  text,
  label = "複製通知",
  done = "已複製 ✓",
}: {
  text: string;
  label?: string;
  done?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "manual">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("manual");
    }
  };

  if (state === "manual") {
    return (
      <textarea
        readOnly
        rows={6}
        value={text}
        style={{ width: "100%" }}
        onFocus={(e) => e.currentTarget.select()}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      className={state === "ok" ? "p-btn p-btn-ghost" : "p-btn"}
      onClick={() => void copy()}
    >
      {state === "ok" ? done : label}
    </button>
  );
}

/** 展開看得到全文，再決定要不要複製。她有時候想先改一兩個字。 */
export function CopyBlock({ text, label }: { text: string; label: string }) {
  return (
    <details className="p-dg-more">
      <summary>{label}</summary>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          fontSize: "0.85rem",
          background: "var(--p-paper)",
          border: "1px solid var(--p-border)",
          borderRadius: 2,
          padding: "0.7rem 0.8rem",
          margin: "0.5rem 0",
        }}
      >
        {text}
      </pre>
      <CopyButton text={text} />
    </details>
  );
}
