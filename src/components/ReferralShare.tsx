"use client";

import { useState } from "react";

export default function ReferralShare({ code, url, zh }: { code: string; url: string; zh: boolean }) {
  const [copied, setCopied] = useState(false);
  return <div>
    <p style={{ overflowWrap: "anywhere" }}><strong>{zh ? "你的邀請碼：" : "Your code: "}</strong><code>{code}</code></p>
    <input className="form-input" readOnly value={url} aria-label={zh ? "邀請連結" : "Invitation link"} onFocus={(e) => e.currentTarget.select()} />
    <button className="btn-ghost" style={{ marginTop: "1rem" }} onClick={async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
    }}>{copied ? (zh ? "已複製" : "Copied") : (zh ? "複製邀請連結" : "Copy invitation link")}</button>
  </div>;
}
