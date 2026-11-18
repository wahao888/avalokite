"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

export const REFERRAL_STORAGE = "avalo-referral-code";

export default function ReferralInvite({ code, zh }: { code: string; zh: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    try { sessionStorage.setItem(REFERRAL_STORAGE, code); } catch { /* 仍可手動填碼 */ }
  }, [code]);
  return (
    <div className="cart-summary" style={{ marginBottom: "2rem" }}>
      <div className="form-label">{zh ? "朋友的邀請碼" : "Your friend's invitation code"}</div>
      <p style={{ fontSize: "1.4rem", overflowWrap: "anywhere" }}><code>{code}</code></p>
      <p className="care-required-note">{zh
        ? "結帳時使用此碼並完成任一項目付款，雙方各獲得一個月免費維護。尚未訂閱也會先為你保留。邀請碼資格於付款成功時確認。"
        : "Use this code at checkout and pay for any item to earn one free month of care for both of you. Your month is saved if you haven't subscribed. Eligibility is confirmed at payment."}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <Link className="btn-primary" href="/pricing">{zh ? "查看方案" : "View plans"}</Link>
        <button className="btn-ghost" onClick={async () => {
          try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); }
        }}>{copied ? (zh ? "已複製" : "Copied") : (zh ? "複製邀請碼" : "Copy code")}</button>
      </div>
    </div>
  );
}
