import { fmt, getProduct } from "@/lib/products";
import { SITE } from "@/lib/site";

export interface FaqItem {
  q: string;
  a: string;
}

const p = (sku: string) => {
  const x = getProduct(sku);
  if (!x) throw new Error(`faq 引用了不存在的方案：${sku}`);
  return `NT$${fmt(x.price)}`;
};

export const SITE_FAQ: Record<"zh-TW" | "en", FaqItem[]> = {
  "zh-TW": [
    {
      q: "形象官網多少錢？交期怎麼算？",
      a: `標準形象官網 ${p("web-basic")}（未稅）起，約 2–3 週。交期自文案與圖片齊備那天起算，不是自付款日起算。商務網站（電商／預約）為 ${p("web-commerce")} 起，約 3–5 週。`,
    },
    {
      q: "為什麼建置一定要搭配維護？",
      a: `網站上線後要有人顧主機、SSL、備份與安全更新。形象官網建議安心維護 ${p("care-basic")}／月，自驗收通過才開始計費，最短承諾 12 個月，期滿後可隨時終止。標價未稅，結帳加 5% 營業稅。`,
    },
    {
      q: "網域與原始碼在誰名下？",
      a: "自有網域一律登記在你名下。標準建置案的原始碼於維護承諾期滿後免費移交；促銷「零元啟動」則於 24 個月期滿後移交。解約後提供 6 個月轉址，不綁架流量。",
    },
    {
      q: "上線之後可以自己改內容嗎？",
      a: "安心維護每月 2 次小幅修改，成長維護每月 4 小時。內容天天在變（例如今日口味、豆子售完）可以加做專屬後台，店家用手機就能改。",
    },
    {
      q: "跟 Wix、Shopline、WordPress 差在哪？",
      a: "套版平台適合預算有限、想自己動手的人。Avalo 做的是依品牌量身的全客製、速度與 SEO 有人負責、上線後有人維護，而且價格公開、可線上下單。需要自己改版面的人，套版會更合適。",
    },
    {
      q: "能不能開統編發票？",
      a: `可以。結帳時填統一編號即可。營業主體是鏈盾股份有限公司（統編 60543664），客服信箱 ${SITE.email}。`,
    },
    {
      q: "AI 客服會不會亂報價？",
      a: "知識庫裡的價格都是從同一份商品目錄算出來的。客服被禁止自己做加總或年度試算；跨方案總額一律請客人用購物車試算，或由專人書面報價。這條規則有自動測試在守。",
    },
    {
      q: "零元啟動跟標準形象官網差在哪？",
      a: "零元啟動把建置費攤進 24 個月月費，下單只收席次保留金，上線驗收後折抵第一期。承諾期較長，期內提前終止須補付尚未攤完的建置費。檔期與席次以定價頁為準。",
    },
  ],
  en: [
    {
      q: "How much is a brand website, and how is the timeline counted?",
      a: `A standard brand site starts at ${p("web-basic")} (excl. VAT), about 2–3 weeks. The clock starts when copy and images are ready, not when you pay. A commerce site starts at ${p("web-commerce")}, about 3–5 weeks.`,
    },
    {
      q: "Why does every build require a care plan?",
      a: `Someone has to watch hosting, SSL, backups and security updates. Essential Care is ${p("care-basic")}/month, billed only after launch and acceptance, with a 12-month minimum, cancellable any time after. Prices exclude 5% VAT.`,
    },
    {
      q: "Whose name is the domain and source code in?",
      a: "Your domain is registered in your name. Source code is handed over free at the end of the care commitment (24 months on the Zero Setup promo). After you leave we provide a 6-month redirect.",
    },
    {
      q: "Can I edit the site myself after launch?",
      a: "Essential Care includes two small edits a month; Growth Care includes four hours. If content changes daily we can build a dashboard you run from a phone.",
    },
    {
      q: "How is this different from Wix, Shopline or WordPress?",
      a: "Builders suit tight budgets and DIY. Avalo is fully custom around your brand, with someone responsible for speed and SEO and someone maintaining it after launch — published prices, order online. If you want to restyle it yourself, a builder is a better fit.",
    },
    {
      q: "Can you issue a Taiwan GUI receipt?",
      a: `Yes — enter your tax ID at checkout. The legal entity is Lien Dun Co., Ltd. (tax ID 60543664). Support: ${SITE.email}.`,
    },
    {
      q: "Will the AI support agent invent prices?",
      a: "Prices in the knowledge base are computed from the same product catalogue. The agent is forbidden from adding items up or annualising fees; combined totals go through the cart or a written quote. That rule is pinned by tests.",
    },
    {
      q: "How does Zero Setup differ from the standard brand site?",
      a: "Zero Setup spreads the build fee across 24 months of care. You pay a seat deposit at checkout, credited to month one after launch. Leaving during the term means paying the unamortised build fee. Seats and dates are as shown on the pricing page.",
    },
  ],
};
