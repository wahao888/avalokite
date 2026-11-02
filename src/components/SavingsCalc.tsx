"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fmt, getProduct, withTax } from "@/lib/products";
import { track } from "@/lib/track";

export default function SavingsCalc() {
  const zh = useLocale() !== "en";
  const [n, setN] = useState(80);
  const [minutes, setMinutes] = useState(6);
  const [wage, setWage] = useState(250);
  const hours = (n * minutes) / 60;
  const monthly = Math.round(hours * wage);
  const yearly = monthly * 12;
  const bot = getProduct("ai-chatbot")!;
  const care = getProduct("care-ai")!;
  const yearCost = bot.price + care.price * 12;

  return (
    <div className="tool-panel">
      <label className="form-label">
        {zh ? "每月詢問則數" : "Enquiries per month"}
        <input className="form-input" type="number" min={1} value={n} onChange={(e) => setN(Number(e.target.value) || 0)} />
      </label>
      <label className="form-label">
        {zh ? "每則平均分鐘" : "Minutes per enquiry"}
        <input className="form-input" type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} />
      </label>
      <label className="form-label">
        {zh ? "時薪（新台幣）" : "Hourly cost (TWD)"}
        <input className="form-input" type="number" min={1} value={wage} onChange={(e) => setWage(Number(e.target.value) || 0)} />
      </label>
      <div className="quiz-result">
        <p>
          {zh ? "現在每月大約" : "About"} {hours.toFixed(1)} {zh ? "小時、" : "hours/month, "}
          NT${fmt(monthly)}
          {zh ? "／月。" : "/month."}
          <br />
          {zh ? "一年人力約" : "Labour per year about"} NT${fmt(yearly)}。
          <br />
          {zh ? "AI 客服第一年（建置＋維運，未稅）約" : "AI support year one (build + ops, excl. VAT) about"} NT$
          {fmt(yearCost)}
          {zh ? `，含稅約 NT$${fmt(withTax(yearCost))}。` : ` (incl. VAT NT$${fmt(withTax(yearCost))}).`}
        </p>
        <p className="form-note">
          {zh
            ? "這是用你填的數字乘出來的對照，不是保證省下的金額。AI 仍會轉真人。"
            : "This multiplies the numbers you typed. It is not a guaranteed saving. The agent still hands off to a human."}
        </p>
        <Link
          href="/services/line-ai-chatbot"
          className="btn-primary"
          onClick={() => track("tool_savings", { yearly, yearCost })}
        >
          {zh ? "看 AI 客服方案 →" : "See the AI support plan →"}
        </Link>
      </div>
    </div>
  );
}
