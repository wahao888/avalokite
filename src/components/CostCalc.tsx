"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ADDONS, fmt, getProduct, withTax } from "@/lib/products";
import { track } from "@/lib/track";

export default function CostCalc() {
  const zh = useLocale() !== "en";
  const [commerce, setCommerce] = useState(false);
  const [i18n, setI18n] = useState(false);
  const [booking, setBooking] = useState(false);
  const [domain, setDomain] = useState(true);

  const build = getProduct(commerce ? "web-commerce" : "web-basic")!;
  const care = getProduct(commerce ? "care-growth" : "care-basic")!;
  const extras = useMemo(() => {
    const ids = [
      i18n ? "i18n" : "",
      booking ? "booking" : "",
      domain ? "domain" : "",
    ].filter(Boolean);
    return ADDONS.filter((a) => ids.includes(a.id));
  }, [i18n, booking, domain]);
  const extraSum = extras.reduce((s, a) => s + a.price, 0);
  const year = build.price + extraSum + care.price * 12;

  return (
    <div className="tool-panel">
      <label className="quiz-check">
        <input type="checkbox" checked={commerce} onChange={(e) => setCommerce(e.target.checked)} />
        {zh ? "要在網站上收錢或接預約（商務網站）" : "Take payment or bookings (commerce site)"}
      </label>
      <label className="quiz-check">
        <input type="checkbox" checked={i18n} onChange={(e) => setI18n(e.target.checked)} />
        {zh ? "多語系" : "Multilingual"}
      </label>
      <label className="quiz-check">
        <input type="checkbox" checked={booking} onChange={(e) => setBooking(e.target.checked)} />
        {zh ? "線上預約（加購）" : "Online booking (add-on)"}
      </label>
      <label className="quiz-check">
        <input type="checkbox" checked={domain} onChange={(e) => setDomain(e.target.checked)} />
        {zh ? "代為申請自有網域" : "Register a domain in your name"}
      </label>
      <div className="quiz-result">
        <p>
          {zh ? "建置（未稅）" : "Build (excl. VAT)"} NT${fmt(build.price + extraSum)}
          <br />
          {zh ? "維護 12 個月（未稅）" : "12 months of care (excl. VAT)"} NT${fmt(care.price * 12)}
          <br />
          <strong>
            {zh ? "第一年未稅約" : "Year one excl. VAT about"} NT${fmt(year)}
            {zh ? "，含稅約" : ", incl. VAT about"} NT${fmt(withTax(year))}
          </strong>
        </p>
        <p className="form-note">
          {zh
            ? "維護自驗收通過才開始計。這是標準方案相加，不是報價；超出範圍另計。"
            : "Care starts after acceptance. This adds list prices; it is not a quote."}
        </p>
        <Link href="/pricing" className="btn-primary" onClick={() => track("tool_cost", { year })}>
          {zh ? "對照定價頁 →" : "See pricing →"}
        </Link>
      </div>
    </div>
  );
}
