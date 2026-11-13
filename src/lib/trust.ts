import type { DoodleName } from "@/lib/doodle";

export interface TrustMark {
  icon: DoodleName;
  t: string;
  d: string;
}

export const TRUST_MARKS: Record<"zh-TW" | "en", TrustMark[]> = {
  "zh-TW": [
    { icon: "tag", t: "價格公開、不二價", d: "方案價格寫在網站上，書面報價也不議價。" },
    { icon: "key", t: "網域登記在你名下", d: "登記人是你，日後搬家不受綁架。" },
    { icon: "signpost", t: "解約提供 6 個月轉址", d: "資料屬於你，原網址還能指到新家半年。" },
    { icon: "bandage", t: "上線後 14 日錯誤修正免費", d: "驗收後兩週內的錯誤免費修，不另計時。" },
  ],
  en: [
    { icon: "tag", t: "Published prices, no haggling", d: "Plan prices are on this site; written quotes are equally final." },
    { icon: "key", t: "Domain in your name", d: "You are the registrant — never locked in." },
    { icon: "signpost", t: "6-month redirect on exit", d: "Your data stays yours; the old URL points to the new home for six months." },
    { icon: "bandage", t: "14 days of free bug-fixes", d: "Defects in the two weeks after acceptance are fixed on us." },
  ],
};
