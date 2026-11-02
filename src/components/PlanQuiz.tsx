"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import { promoOpen } from "@/lib/promo-window";
import { track } from "@/lib/track";

type Ans = { pay?: boolean; pages?: "few" | "many"; ai?: boolean };

export default function PlanQuiz() {
  const zh = useLocale() !== "en";
  const { add } = useCart();
  const router = useRouter();
  const [a, setA] = useState<Ans>({});

  const ready = a.pay !== undefined && a.pages !== undefined && a.ai !== undefined;
  const sku = a.pay || a.pages === "many" ? "web-commerce" : "web-basic";
  const launch = promoOpen() && sku === "web-basic";

  const go = () => {
    if (launch) {
      router.push("/launch");
    } else {
      add(sku);
      if (a.ai) add("ai-chatbot");
      router.push("/cart");
    }
    track("quiz_complete", { sku, launch: launch ? 1 : 0, ai: a.ai ? 1 : 0 });
  };

  return (
    <div className="quiz">
      <fieldset>
        <legend>{zh ? "要在網站上收錢或接預約嗎？" : "Take payment or bookings on the site?"}</legend>
        <label><input type="radio" name="pay" onChange={() => setA({ ...a, pay: true })} /> {zh ? "要" : "Yes"}</label>
        <label><input type="radio" name="pay" onChange={() => setA({ ...a, pay: false })} /> {zh ? "先不要" : "Not yet"}</label>
      </fieldset>
      <fieldset>
        <legend>{zh ? "大概需要幾頁？" : "About how many pages?"}</legend>
        <label><input type="radio" name="pages" onChange={() => setA({ ...a, pages: "few" })} /> {zh ? "五頁以內" : "Up to five"}</label>
        <label><input type="radio" name="pages" onChange={() => setA({ ...a, pages: "many" })} /> {zh ? "更多，或要後台" : "More, or an admin"}</label>
      </fieldset>
      <fieldset>
        <legend>{zh ? "需要 LINE／網站 AI 客服嗎？" : "Need LINE / on-site AI support?"}</legend>
        <label><input type="radio" name="ai" onChange={() => setA({ ...a, ai: true })} /> {zh ? "需要" : "Yes"}</label>
        <label><input type="radio" name="ai" onChange={() => setA({ ...a, ai: false })} /> {zh ? "先不用" : "Not now"}</label>
      </fieldset>
      {ready && (
        <div className="quiz-result">
          <p>
            {launch
              ? zh
                ? "這一檔「零元啟動」符合形象官網。先看條件與剩餘名額。"
                : "The Zero Setup run fits a brand site. Check the terms and remaining seats."
              : zh
                ? `建議從「${sku === "web-commerce" ? "商務網站" : "形象官網"}」開始${a.ai ? "，並加上 AI 智能客服" : ""}。`
                : `Start with the ${sku === "web-commerce" ? "Commerce" : "Brand"} plan${a.ai ? ", plus AI support" : ""}.`}
          </p>
          <button type="button" className="btn-primary" onClick={go}>
            {launch ? (zh ? "看零元啟動 →" : "See Zero Setup →") : zh ? "加入購物車 →" : "Add to cart →"}
          </button>
        </div>
      )}
    </div>
  );
}
