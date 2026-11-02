"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

// 換頁不會掉（Next 是前端導航），但重新整理會，所以把對話留在 sessionStorage。
// 伺服器那邊是靠 cookie 認同一位訪客，重整後接得回去——這裡存的只是「畫面上看得到的」
// 那幾句，關掉分頁就沒了，不是紀錄的真實來源。
const STORE_KEY = "avalo-chat";

export default function ChatWidget() {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setTurns(JSON.parse(saved));
    } catch {
      // 無痕模式或使用者擋了儲存：沒有歷史也能照常對話
    }
  }, []);

  useEffect(() => {
    if (turns.length === 0) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(turns));
    } catch {
      /* 同上，存不進去不影響對話 */
    }
  }, [turns]);

  // 新訊息進來就捲到底，否則使用者得自己往下拉才看得到回覆
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { reply?: string };
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || t("error") },
      ]);
    } catch {
      setTurns((prev) => [...prev, { role: "assistant", content: t("error") }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        type="button"
        className={`chat-fab${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("close") : t("launcher")}
        aria-expanded={open}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        )}
      </button>

      <div className={`chat-panel${open ? " is-open" : ""}`} role="dialog" aria-label={t("title")}>
        <header className="chat-head">
          <div>
            <strong>{t("title")}</strong>
            <span className="chat-sub">{t("subtitle")}</span>
          </div>
          <button type="button" className="chat-x" onClick={() => setOpen(false)} aria-label={t("close")}>
            ×
          </button>
        </header>

        <div className="chat-log" ref={listRef}>
          <div className="chat-msg is-bot">{t("greeting")}</div>
          {turns.map((turn, i) => (
            <div key={i} className={`chat-msg is-${turn.role === "user" ? "me" : "bot"}`}>
              {turn.content}
            </div>
          ))}
          {busy && (
            <div className="chat-msg is-bot chat-typing" aria-label={t("thinking")}>
              <i /><i /><i />
            </div>
          )}
        </div>

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={1000}
            aria-label={t("placeholder")}
          />
          <button type="submit" disabled={busy || !draft.trim()}>
            {t("send")}
          </button>
        </form>
        <p className="chat-note">{t("disclaimer")}</p>
      </div>
    </>
  );
}
