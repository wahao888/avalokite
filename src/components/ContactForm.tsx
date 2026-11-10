"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { track } from "@/lib/track";

type Status = "idle" | "submitting" | "ok" | "err" | "badEmail";

/**
 * 諮詢表單
 *
 * 冷流量的表單越短越好，所以必填只剩三欄：姓名、聯絡方式、想做什麼。
 * 聯絡方式是單一欄位 —— 填的字串含 @ 就當 Email 送、否則當電話／LINE ID 送，
 * 後端的 schema（email 與 phone 擇一必填）不用動。
 * 公司、服務類型、預算改成「補充資訊」折疊起來，想填的人才展開。
 */
export default function ContactForm() {
  const t = useTranslations("contact.form");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [moreOpen, setMoreOpen] = useState(false);

  const serviceOptions = t.raw("serviceOptions") as string[];
  const budgetOptions = t.raw("budgetOptions") as string[];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    const contact = String(data.contact ?? "").trim();
    // LINE ID 幾乎都以 @ 開頭（@958nplck），不能只用「含有 @」判斷是不是 Email，
    // 否則整組 LINE 使用者都會被擋在 badEmail。開頭是 @ 一律當 LINE ID。
    const isLineId = contact.startsWith("@");
    const looksLikeEmail = !isLineId && contact.includes("@");
    if (looksLikeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setStatus("badEmail");
      return;
    }
    delete data.contact;

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: looksLikeEmail ? contact : "",
          phone: looksLikeEmail ? "" : contact,
          locale,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      track("generate_lead", { via: "form" });
      form.reset();
      setMoreOpen(false);
    } catch {
      setStatus("err");
    }
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="form-title">{t("title")}</div>
      <div className="form-subtitle">{t("subtitle")}</div>

      {/* Honeypot：一般使用者看不到，機器人填了就會被靜默丟棄 */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          {t("honeypot")}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {status === "ok" && <div className="form-feedback ok">{t("success")}</div>}
      {status === "err" && <div className="form-feedback err">{t("error")}</div>}
      {status === "badEmail" && <div className="form-feedback err">{t("badEmail")}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="cf-name">{t("name")}</label>
        <input
          id="cf-name"
          name="name"
          required
          maxLength={100}
          className="form-input"
          placeholder={t("namePh")}
          autoComplete="name"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cf-contact">{t("contact")}</label>
        <input
          id="cf-contact"
          name="contact"
          required
          maxLength={200}
          className="form-input"
          placeholder={t("contactPh")}
        />
        <p className="form-note">{t("contactHint")}</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cf-message">{t("message")}</label>
        <textarea
          id="cf-message"
          name="message"
          maxLength={3000}
          className="form-textarea"
          placeholder={t("messagePh")}
        />
      </div>

      <button
        type="button"
        className="form-more-toggle"
        aria-expanded={moreOpen}
        aria-controls="cf-more"
        onClick={() => setMoreOpen((v) => !v)}
      >
        <span className="form-more-sign" aria-hidden="true">{moreOpen ? "−" : "＋"}</span>
        {t("moreToggle")}
      </button>

      <div id="cf-more" className="form-more" hidden={!moreOpen}>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-company">{t("company")}</label>
          <input id="cf-company" name="company" maxLength={200} className="form-input" placeholder={t("companyPh")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-service">{t("service")}</label>
          <select id="cf-service" name="service" className="form-select" defaultValue="">
            <option value="" disabled>{t("servicePh")}</option>
            {serviceOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-budget">{t("budget")}</label>
          <select id="cf-budget" name="budget" className="form-select" defaultValue="">
            <option value="" disabled>{t("budgetPh")}</option>
            {budgetOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ width: "100%", padding: "1rem", fontSize: "0.8rem" }}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
