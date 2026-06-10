"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Status = "idle" | "submitting" | "ok" | "err";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

  const serviceOptions = t.raw("serviceOptions") as string[];
  const budgetOptions = t.raw("budgetOptions") as string[];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("err");
    }
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="form-title">{t("title")}</div>
      <div className="form-subtitle">{t("subtitle")}</div>

      {status === "ok" && <div className="form-feedback ok">{t("success")}</div>}
      {status === "err" && <div className="form-feedback err">{t("error")}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="cf-name">{t("name")}</label>
          <input id="cf-name" name="name" required maxLength={100} className="form-input" placeholder={t("namePh")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-company">{t("company")}</label>
          <input id="cf-company" name="company" maxLength={200} className="form-input" placeholder={t("companyPh")} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="cf-email">{t("email")}</label>
          <input id="cf-email" name="email" type="email" required maxLength={200} className="form-input" placeholder={t("emailPh")} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cf-phone">{t("phone")}</label>
          <input id="cf-phone" name="phone" maxLength={50} className="form-input" placeholder={t("phonePh")} />
        </div>
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

      <div className="form-group">
        <label className="form-label" htmlFor="cf-message">{t("message")}</label>
        <textarea id="cf-message" name="message" required maxLength={3000} className="form-textarea" placeholder={t("messagePh")} />
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
