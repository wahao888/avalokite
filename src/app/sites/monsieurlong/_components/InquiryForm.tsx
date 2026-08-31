"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { SITE } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   合作邀請 / 訂購詢問表單

   一支元件、兩種用途（kind="collab" | "custom"），送到同一支 API，
   同一個後台列表——店家只要看一個地方。

   驗證分兩層，兩層都要有：
   前端擋掉打字打到一半的低級錯誤（體驗），伺服器端的 zod 才是真正的
   防線（前端可以被繞過）。防機器人是 honeypot ＋ 停留時間門檻 ＋
   伺服器端的 IP 速率限制。
   ═══════════════════════════════════════════════════════════════ */

export type InquiryKind = "collab" | "custom";

const CONFIG = {
  collab: {
    typeLabel: "合作類型",
    types: [
      "品牌聯名",
      "市集邀請",
      "快閃活動",
      "公司活動",
      "Private Event",
      "Catering 外燴",
      "其他",
    ],
    dateLabel: "活動日期",
    datePlaceholder: "例：2026-11-15，或「11 月中旬」",
    scaleLabel: "預估人數",
    scalePlaceholder: "例：120 人",
    placeLabel: "地點",
    placePlaceholder: "例：台北市信義區・室內",
    messageLabel: "想做什麼",
    messagePlaceholder:
      "簡單描述活動、想像中的合作方式，以及任何我們該先知道的事。",
    submit: "送出合作邀請",
    successTitle: "收到了，謝謝你的邀請。",
    successBody:
      "我們會在幾個工作天內回信。若是急件，也可以直接在 Instagram 私訊我們。",
  },
  custom: {
    typeLabel: "訂購類型",
    types: ["伴手禮禮盒", "客製化蛋糕", "法式小點", "大量訂購", "企業送禮", "其他"],
    dateLabel: "希望取貨日",
    datePlaceholder: "例：2026-09-20",
    scaleLabel: "數量",
    scalePlaceholder: "例：30 盒 / 一個 6 吋",
    placeLabel: "取貨方式",
    placePlaceholder: "例：門市自取 / 需要宅配",
    messageLabel: "需求說明",
    messagePlaceholder:
      "口味偏好、預算、蛋糕上想寫的字、有沒有需要避開的食材，都可以寫在這裡。",
    submit: "送出訂購詢問",
    successTitle: "收到了，我們會盡快回覆。",
    successBody:
      "客製化品項需要提前安排，我們回信時會一併確認可行的時間與細節。",
  },
} as const;

type Errors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function InquiryForm({ kind }: { kind: InquiryKind }) {
  const cfg = CONFIG[kind];
  const mountedAt = useRef(Date.now());
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  function validate(fd: FormData): Errors {
    const e: Errors = {};
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const type = String(fd.get("type") ?? "").trim();

    if (name.length < 1) e.name = "請留下稱呼，我們回信時才知道要找誰。";
    if (name.length > 100) e.name = "太長了，100 字以內。";
    if (!EMAIL_RE.test(email)) e.email = "請填寫收得到信的 Email。";
    if (!type) e.type = `請選一個${cfg.typeLabel}。`;
    if (message.trim().length < 5) e.message = "多寫幾句，我們才回得準。";
    if (message.length > 3000) e.message = "超過 3000 字了，請精簡一下。";
    return e;
  }

  async function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);

    const e = validate(fd);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      // 捲到第一個出錯的欄位，手機上尤其重要
      form.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea')?.focus();
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/monsieurlong/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          type: String(fd.get("type") ?? ""),
          name: String(fd.get("name") ?? ""),
          company: String(fd.get("company") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          social: String(fd.get("social") ?? ""),
          date: String(fd.get("date") ?? ""),
          place: String(fd.get("place") ?? ""),
          scale: String(fd.get("scale") ?? ""),
          budget: String(fd.get("budget") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: String(fd.get("website") ?? ""), // honeypot
          elapsed: Date.now() - mountedAt.current,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("done");
      form.reset();
    } catch {
      setState("error");
    }
  }

  const field = (name: string) => ({
    className: "ml-field",
    "data-invalid": errors[name] ? "true" : undefined,
  });

  const inputProps = (name: string) => ({
    id: `ml-${kind}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `ml-${kind}-${name}-err` : undefined,
  });

  const Err = ({ name }: { name: string }) =>
    errors[name] ? (
      <span className="ml-err" id={`ml-${kind}-${name}-err`}>
        {errors[name]}
      </span>
    ) : null;

  if (state === "done") {
    return (
      <m.div
        className="ml-result"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        role="status"
      >
        <span className="ml-tag ml-tag--limited">已送出</span>
        <h3>{cfg.successTitle}</h3>
        <p className="ml-lede">{cfg.successBody}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            className="ml-btn ml-btn--ghost"
            href={SITE.instagram}
            target="_blank"
            rel="noreferrer noopener"
          >
            Instagram {SITE.instagramHandle}
          </a>
          <button type="button" className="ml-btn ml-btn--ghost" onClick={() => setState("idle")}>
            再送一封
          </button>
        </div>
      </m.div>
    );
  }

  return (
    <form className="ml-form" onSubmit={onSubmit} noValidate>
      {/* honeypot：真人看不到也不會 tab 到，機器人會乖乖填 */}
      <div className="ml-hp" aria-hidden="true">
        <label htmlFor={`ml-${kind}-website`}>Website</label>
        <input id={`ml-${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div {...field("name")}>
        <label htmlFor={`ml-${kind}-name`}>
          稱呼 <em>*</em>
        </label>
        <input {...inputProps("name")} type="text" autoComplete="name" required />
        <Err name="name" />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-company`}>公司 / 品牌</label>
        <input id={`ml-${kind}-company`} name="company" type="text" autoComplete="organization" />
      </div>

      <div {...field("email")}>
        <label htmlFor={`ml-${kind}-email`}>
          Email <em>*</em>
        </label>
        <input {...inputProps("email")} type="email" autoComplete="email" required />
        <Err name="email" />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-phone`}>電話</label>
        <input id={`ml-${kind}-phone`} name="phone" type="tel" autoComplete="tel" />
      </div>

      <div {...field("type")}>
        <label htmlFor={`ml-${kind}-type`}>
          {cfg.typeLabel} <em>*</em>
        </label>
        <select {...inputProps("type")} defaultValue="" required>
          <option value="" disabled>
            請選擇
          </option>
          {cfg.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Err name="type" />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-social`}>Instagram / 網站</label>
        <input id={`ml-${kind}-social`} name="social" type="text" placeholder="@yourbrand" />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-date`}>{cfg.dateLabel}</label>
        <input id={`ml-${kind}-date`} name="date" type="text" placeholder={cfg.datePlaceholder} />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-place`}>{cfg.placeLabel}</label>
        <input id={`ml-${kind}-place`} name="place" type="text" placeholder={cfg.placePlaceholder} />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-scale`}>{cfg.scaleLabel}</label>
        <input id={`ml-${kind}-scale`} name="scale" type="text" placeholder={cfg.scalePlaceholder} />
      </div>

      <div className="ml-field">
        <label htmlFor={`ml-${kind}-budget`}>預算（選填）</label>
        <input id={`ml-${kind}-budget`} name="budget" type="text" placeholder="例：3–5 萬" />
      </div>

      <div className="ml-field ml-f-wide" data-invalid={errors.message ? "true" : undefined}>
        <label htmlFor={`ml-${kind}-message`}>
          {cfg.messageLabel} <em>*</em>
        </label>
        <textarea {...inputProps("message")} placeholder={cfg.messagePlaceholder} required />
        <Err name="message" />
      </div>

      <div className="ml-form-foot">
        <button
          type="submit"
          className="ml-btn ml-btn--primary"
          disabled={state === "sending"}
          aria-busy={state === "sending"}
        >
          {state === "sending" ? "送出中…" : cfg.submit}
        </button>
        <p className="ml-form-note">
          送出即表示同意我們以你留下的聯絡方式回覆此次詢問。資料只用於本次聯繫。
        </p>
      </div>

      <AnimatePresence>
        {state === "error" && (
          <m.p
            className="ml-err ml-f-wide"
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            送不出去。可能是網路不穩，或是短時間內送太多次了。請稍後再試，
            或直接在 Instagram 私訊我們。
          </m.p>
        )}
      </AnimatePresence>
    </form>
  );
}
