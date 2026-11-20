"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";

interface Turn {
  role: "user" | "assistant";
  content: string;
  /** 客服建議的下一句，只顯示在最後一則客服訊息下面 */
  quickReplies?: string[];
}

const URL_RE = /(https?:\/\/[^\s，。、）)」]+)/g;

/**
 * 只把「自家網站」的網址變成可點連結。
 *
 * 回覆是模型產生的，客人有辦法誘導它吐出任意網址；畫成可點的連結就等於
 * 我們替那個網址背書。所以只認本站與 avalokite.xyz 底下的網域，其他照純文字顯示。
 */
function trustedHost(href: string): boolean {
  try {
    const host = new URL(href).hostname;
    return host === window.location.hostname || host === "avalokite.xyz" || host.endsWith(".avalokite.xyz");
  } catch {
    return false;
  }
}

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 && trustedHost(part) ? (
          <a key={i} href={part}>
            {part.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
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
  const chips = t.raw("chips") as string[];

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
    document.body.classList.toggle("chat-open", open);
    return () => document.body.classList.remove("chat-open");
  }, [open]);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      track("open_chat", { place: "event" });
    };
    window.addEventListener("avalo:open-chat", onOpen);
    return () => window.removeEventListener("avalo:open-chat", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text?: string) {
    const message = (text ?? draft).trim();
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
      const data = (await res.json()) as { reply?: string; quickReplies?: string[] };
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || t("error"), quickReplies: data.quickReplies ?? [] },
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
        onClick={() => {
          setOpen((v) => {
            if (!v) track("open_chat", { place: "fab" });
            return !v;
          });
        }}
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
          {turns.length === 0 && (
            <div className="chat-chips">
              {chips.map((c) => (
                <button key={c} type="button" onClick={() => void send(c)} disabled={busy}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} className={`chat-msg is-${turn.role === "user" ? "me" : "bot"}`}>
              {turn.role === "assistant" ? <Linkified text={turn.content} /> : turn.content}
            </div>
          ))}
          {/* 建議回覆只跟著最後一則：舊訊息下的按鈕點了會接不上目前的話題 */}
          {!busy && turns.at(-1)?.role === "assistant" && (turns.at(-1)?.quickReplies?.length ?? 0) > 0 && (
            <div className="chat-chips">
              {turns.at(-1)!.quickReplies!.map((c) => (
                <button key={c} type="button" onClick={() => void send(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
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
