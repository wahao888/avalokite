"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "./Icons";

// 一鍵複製（匯款帳號用）。
//
// LINE 的內建瀏覽器與舊版 iOS 可能擋掉 clipboard API，所以一定要有退路：
// 失敗時退回一個自動全選的 textarea，讓她長按「拷貝」。
// 沒有退路的話帳號就得手抄，那是最容易出錯的一步。

export function CopyText({ value, label }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "manual">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
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
        rows={1}
        value={value}
        style={{ width: "100%" }}
        onFocus={(e) => e.currentTarget.select()}
        autoFocus
      />
    );
  }

  return (
    <button type="button" className="am-copy" onClick={() => void copy()}>
      {state === "ok" ? <IconCheck size={15} stroke={2.2} /> : <IconCopy size={15} stroke={1.9} />}
      {state === "ok" ? "已複製" : (label ?? "複製")}
    </button>
  );
}
