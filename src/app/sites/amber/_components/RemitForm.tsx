"use client";

import { useState } from "react";
import { IconAlert, IconBank, IconCheck } from "./Icons";

// 匯款回報。客人 → Amber 方向唯一的閉環：沒有它，末五碼會散在
// 幾十則 LINE 訊息裡，她要一則一則對帳。

export function RemitForm({ token, reported }: { token: string; reported: string | null }) {
  const [last5, setLast5] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(reported));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/amber/settlement/remit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, last5, remitName: name }),
      });
      if (!res.ok) {
        setError(res.status === 400 ? "請填寫正確的末五碼（5 位數字）。" : "回報失敗，請再試一次。");
        return;
      }
      setDone(true);
    } catch {
      setError("網路不穩，請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="am-note">
        <div className="am-note__h">
          <IconCheck size={16} stroke={2.2} />
          已收到你的匯款回報{reported ? `（末五碼 ${reported}）` : ""}
        </div>
        我們核帳後會在 LINE 通知你，並安排出貨。
      </div>
    );
  }

  return (
    <div>
      <div className="am-field">
        <label htmlFor="r-last5">匯款帳號末五碼</label>
        <input
          id="r-last5"
          inputMode="numeric"
          maxLength={5}
          value={last5}
          onChange={(e) => setLast5(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="12345"
        />
      </div>
      <div className="am-field">
        <label htmlFor="r-name">匯款人姓名（選填）</label>
        <input id="r-name" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="am-field__hint">用別人的帳戶匯款時填一下，比較好對。</p>
      </div>
      {error && (
        <div className="am-err">
          <IconAlert size={18} stroke={1.9} />
          <span>{error}</span>
        </div>
      )}
      <button
        type="button"
        className="am-btn am-btn--accent am-btn--full"
        disabled={busy || last5.length !== 5}
        onClick={() => void submit()}
      >
        {busy ? (
          "送出中…"
        ) : (
          <>
            <IconBank size={17} stroke={1.9} />
            我已匯款
          </>
        )}
      </button>
    </div>
  );
}
