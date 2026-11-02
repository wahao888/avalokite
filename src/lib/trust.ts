export const TRUST_MARKS: Record<"zh-TW" | "en", { t: string; d: string }[]> = {
  "zh-TW": [
    { t: "價格公開、不二價", d: "標準方案寫在網站上，諮詢後的書面報價也不議價。" },
    { t: "網域登記在你名下", d: "代為申請時登記人是你，日後搬家不受綁架。" },
    { t: "解約提供 6 個月轉址", d: "資料屬於你。離開之後，原網址還能指到新家半年。" },
    { t: "上線後 14 日錯誤修正免費", d: "驗收後兩週內的 bug 我們修，不另外計時。" },
  ],
  en: [
    { t: "Published prices, no haggling", d: "Standard plans are on this site; written quotes after a consult are equally final." },
    { t: "Domain in your name", d: "When we register it, you are the registrant — never locked in." },
    { t: "6-month redirect on exit", d: "Your data stays yours. After you leave, the old URL still points to the new home for six months." },
    { t: "14 days of free bug-fixes", d: "Defects in the two weeks after acceptance are fixed on us, not on your care hours." },
  ],
};
