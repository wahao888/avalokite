// Avalo 服務目錄 — 唯一商品資料來源（價格皆為未稅 TWD）
// 結帳時加 5% 營業稅：Math.round(price * 1.05)

export type ProductType = "onetime" | "monthly";

// 促銷方案自成一組，於定價區獨立呈現。
// 刻意不與正式方案並排：避免 NT$10,000 的 Launch 與 NT$39,000 的形象官網互相打架。
export type ProductGroup = "promo";

export interface ProductI18n {
  label: string; // 小標（方案類別）
  name: string;
  desc: string;
  features: string[];
  unit: string; // 計價單位說明
}

export interface Product {
  sku: string;
  type: ProductType;
  price: number; // 未稅 TWD；monthly 為每月
  featured?: boolean;
  group?: ProductGroup; // 不設 = 一般方案
  badge?: { "zh-TW": string; en: string }; // 覆寫 featured-badge 文字
  promoNote?: { "zh-TW": string; en: string }; // 卡片底部小字（席次／條件）
  // 建議搭配的維護方案。有此欄位＝該方案必須搭配一份維護（購物車強制擇一），
  // 維護自第一個月起計費；建置費不含任何維護月份。
  recommendedCareSku?: string;
  marketRange: { "zh-TW": string; en: string }; // 台灣行情對照（透明定價賣點）
  i18n: { "zh-TW": ProductI18n; en: ProductI18n };
}

export const TAX_RATE = 0.05;
export const withTax = (n: number) => Math.round(n * (1 + TAX_RATE));
export const fmt = (n: number) => n.toLocaleString("en-US");

export const PRODUCTS: Product[] = [
  {
    sku: "web-basic",
    type: "onetime",
    price: 39000,
    recommendedCareSku: "care-basic",
    marketRange: { "zh-TW": "市場行情 NT$30,000–100,000", en: "Market rate NT$30k–100k" },
    i18n: {
      "zh-TW": {
        label: "網站建置",
        name: "形象官網",
        desc: "5 頁以內的品牌官網，從設計到上線一手包辦。",
        features: [
          "全客製設計，非套版",
          "RWD 響應式（手機／平板／桌機）",
          "SEO 基礎建置＋GA4 安裝",
          "聯絡表單＋LINE 導流",
          "含部署上線與交付驗收",
        ],
        unit: "一次性",
      },
      en: {
        label: "Web Development",
        name: "Brand Website",
        desc: "A fully custom brand site (up to 5 pages), designed and shipped end-to-end.",
        features: [
          "Custom design, no templates",
          "Responsive (mobile / tablet / desktop)",
          "SEO foundation + GA4 setup",
          "Contact form + LINE integration",
          "Deployment and handover included",
        ],
        unit: "one-time",
      },
    },
  },
  {
    sku: "web-commerce",
    type: "onetime",
    price: 89000,
    featured: true,
    recommendedCareSku: "care-growth",
    marketRange: { "zh-TW": "市場行情 NT$75,000–400,000", en: "Market rate NT$75k–400k" },
    i18n: {
      "zh-TW": {
        label: "網站建置",
        name: "商務網站（電商／預約）",
        desc: "可以收錢的網站：購物車、金流、預約、後台一次到位。",
        features: [
          "購物車／預約系統",
          "金流串接（綠界／藍新，含定期定額）",
          "訂單管理後台",
          "電子發票串接可選",
          "含部署上線與交付驗收",
        ],
        unit: "一次性",
      },
      en: {
        label: "Web Development",
        name: "Commerce Website",
        desc: "A website that makes money: cart, payments, booking and admin, all included.",
        features: [
          "Cart / booking system",
          "Payment gateway (incl. recurring billing)",
          "Order management dashboard",
          "E-invoice integration available",
          "Deployment and handover included",
        ],
        unit: "one-time",
      },
    },
  },
  {
    sku: "ai-chatbot",
    type: "onetime",
    price: 69000,
    recommendedCareSku: "care-ai",
    marketRange: { "zh-TW": "市場行情 NT$100,000–500,000", en: "Market rate NT$100k–500k" },
    i18n: {
      "zh-TW": {
        label: "AI 應用",
        name: "AI 智能客服",
        desc: "LINE 官方帳號＋網站雙通道 AI 客服，用你的資料訓練知識庫。",
        features: [
          "LINE OA＋網站即時聊天雙通道",
          "RAG 知識庫（用你的 FAQ／文件訓練）",
          "真人轉接與對話紀錄後台",
          "每月對話用量報表",
          "含部署上線與知識庫首次建置",
        ],
        unit: "一次性",
      },
      en: {
        label: "AI Solutions",
        name: "AI Customer Service",
        desc: "AI support on LINE OA + your website, trained on your own knowledge base.",
        features: [
          "LINE OA + website live chat",
          "RAG knowledge base from your docs/FAQ",
          "Human handoff + conversation logs",
          "Monthly usage reports",
          "Deployment and initial knowledge base setup",
        ],
        unit: "one-time",
      },
    },
  },
  {
    sku: "automation",
    type: "onetime",
    price: 29000,
    recommendedCareSku: "care-ai",
    marketRange: { "zh-TW": "企業年投入約 NT$60,000–450,000", en: "Typical annual spend NT$60k–450k" },
    i18n: {
      "zh-TW": {
        label: "AI 應用",
        name: "企業流程自動化",
        desc: "完全客製、自建系統，把你的作業流程整套自動化——從通知串接，到會計、進銷存等完整系統。",
        features: [
          "完全客製開發，非套版、不綁第三方平台",
          "串接 LINE／Email／Sheets／ERP／POS 等既有工具",
          "可成長為完整系統（財務記帳、報表、審批流）",
          "自建自有，無第三方軟體月租",
          "錯誤監控與通知，含一個月調校期",
        ],
        unit: "每條工作流",
      },
      en: {
        label: "AI Solutions",
        name: "Workflow Automation",
        desc: "Fully custom, self-hosted systems that automate your whole process — from simple integrations to complete accounting or inventory systems.",
        features: [
          "Fully custom build — no templates, no third-party lock-in",
          "Integrates LINE / Email / Sheets / ERP / POS",
          "Grows into a full system (bookkeeping, reports, approvals)",
          "Self-owned — no third-party SaaS fees",
          "Error monitoring & alerts, one month of tuning included",
        ],
        unit: "per workflow",
      },
    },
  },
  {
    sku: "automation-bundle",
    type: "onetime",
    price: 99000,
    recommendedCareSku: "care-ai",
    marketRange: { "zh-TW": "個別購買約 NT$126,000", en: "≈ NT$126k bought separately" },
    i18n: {
      "zh-TW": {
        label: "AI 應用 · 優惠組合",
        name: "自動化起步組合",
        desc: "一次把常見的自動化與可視化組好：多條工作流＋數據儀表板，讓營運自動跑、數字看得見。",
        features: [
          "3 條完整自動化工作流（完全客製）",
          "數據儀表板：整合營運數字、自動產出報表",
          "串接 LINE／Email／Sheets／ERP／POS",
          "自建自有，無第三方軟體月租",
          "含部署上線與交付驗收",
        ],
        unit: "組合一次性",
      },
      en: {
        label: "AI Solutions · Bundle",
        name: "Automation Starter Bundle",
        desc: "The common automation and visibility pieces in one package: multiple workflows plus a data dashboard.",
        features: [
          "3 complete custom automation workflows",
          "Data dashboard: unified metrics + automated reports",
          "LINE / Email / Sheets / ERP / POS integrations",
          "Self-owned — no third-party SaaS fees",
          "Deployment and handover included",
        ],
        unit: "bundle, one-time",
      },
    },
  },
  {
    sku: "dashboard",
    type: "onetime",
    price: 39000,
    recommendedCareSku: "care-growth",
    marketRange: { "zh-TW": "市場少有固定報價", en: "Rarely fixed-priced in market" },
    i18n: {
      "zh-TW": {
        label: "AI 應用",
        name: "數據儀表板",
        desc: "把散在各處的營運數字集中成一頁儀表板，報表自動產生自動寄。",
        features: [
          "整合 POS／電商／廣告／表單數據",
          "即時營運儀表板",
          "週報／月報自動寄送",
          "AI 摘要重點異常",
          "手機可看",
        ],
        unit: "一次性",
      },
      en: {
        label: "AI Solutions",
        name: "Data Dashboard",
        desc: "All your scattered business numbers on one live dashboard, with reports generated and sent automatically.",
        features: [
          "POS / e-commerce / ads / form data unified",
          "Real-time operations dashboard",
          "Automated weekly/monthly reports",
          "AI-highlighted anomalies",
          "Mobile friendly",
        ],
        unit: "one-time",
      },
    },
  },
  {
    sku: "site-rescue",
    type: "onetime",
    price: 9900,
    marketRange: { "zh-TW": "入門首選", en: "Best first step" },
    i18n: {
      "zh-TW": {
        label: "健檢服務",
        name: "網站健檢急救",
        desc: "網站慢、排名差、怕被駭？一週內給你完整體檢報告並修好急症。",
        features: [
          "速度／SEO／資安三面向檢測",
          "AI 搜尋能見度檢測（GEO）",
          "立即可修項目直接修復",
          "書面報告＋改善路線圖",
          "報告費可全額折抵後續服務",
        ],
        unit: "一次性",
      },
      en: {
        label: "Audit",
        name: "Website Health Check",
        desc: "Slow site, poor ranking, security worries? Full audit report within a week, urgent fixes included.",
        features: [
          "Speed / SEO / security audit",
          "AI search visibility check (GEO)",
          "Quick fixes applied on the spot",
          "Written report + improvement roadmap",
          "Fee fully credited toward future work",
        ],
        unit: "one-time",
      },
    },
  },
  // ─── 首波創始客戶計畫（限量促銷）───
  // 「0 元建置」不是獨立 SKU：單購 launch-care（無一次性品項）時，
  // checkout 的 hasBuild=false 分支會讓定期定額當月起扣，正是該方案要的行為。
  {
    sku: "launch-setup",
    type: "onetime",
    price: 10000,
    group: "promo",
    recommendedCareSku: "launch-care",
    badge: { "zh-TW": "限量 10 席", en: "10 seats only" },
    promoNote: {
      "zh-TW": "首波創始客戶名額；創始價於訂閱存續期間鎖定，不隨日後定價調整。",
      en: "Founding-client seats. Your rate stays locked for as long as the subscription runs.",
    },
    marketRange: {
      "zh-TW": "Avalo 標準形象官網 NT$39,000",
      en: "Avalo Brand Website NT$39,000",
    },
    i18n: {
      "zh-TW": {
        label: "創始客戶計畫",
        name: "Launch 快啟官網",
        desc: "託管式形象官網：建置、主機、表單後台一次到位，10 個工作天上線。",
        features: [
          "5 頁以內形象官網，全客製設計",
          "專屬表單後台＋新訊即時 Email 通知",
          "子網域與 SSL 憑證（隨時可改綁自有網域）",
          "GA4、sitemap、結構化資料基礎建置",
          "含部署上線與交付驗收",
        ],
        unit: "一次性",
      },
      en: {
        label: "Founding Client Program",
        name: "Launch Website",
        desc: "A managed brand site: build, hosting and a form dashboard, live in 10 business days.",
        features: [
          "Up to 5 pages, fully custom design",
          "Private form dashboard + instant email alerts",
          "Subdomain with SSL (custom domain any time)",
          "GA4, sitemap and structured data",
          "Deployment and handover included",
        ],
        unit: "one-time",
      },
    },
  },
  {
    sku: "launch-care",
    type: "monthly",
    price: 2000,
    group: "promo",
    badge: { "zh-TW": "創始價鎖定", en: "Rate locked" },
    promoNote: {
      "zh-TW": "亦可 0 元建置啟動，需承諾 24 個月；單購此方案即為該路徑。",
      en: "Also available with zero build fee on a 24-month term — subscribe to this plan alone.",
    },
    marketRange: { "zh-TW": "行情 NT$1,500–5,000/月", en: "Market NT$1.5k–5k/mo" },
    i18n: {
      "zh-TW": {
        label: "創始客戶計畫",
        name: "Launch 託管維護",
        desc: "網站上線之後的一切：主機、備份、監控、改稿與表單後台。",
        features: [
          "主機代管、SSL 憑證與每日自動備份",
          "表單後台、Email 通知與資料 CSV 匯出",
          "每月 1 小時內容修改（文字、圖片、公告）",
          "安全更新與監控告警",
          "資料隨時可匯出，解約提供 6 個月轉址",
        ],
        unit: "每月",
      },
      en: {
        label: "Founding Client Program",
        name: "Launch Care",
        desc: "Everything after launch: hosting, backups, monitoring, edits and your form dashboard.",
        features: [
          "Hosting, SSL and daily automated backups",
          "Form dashboard, email alerts and CSV export",
          "1 hour of content edits every month",
          "Security updates and uptime alerts",
          "Export your data any time; 6-month redirect on exit",
        ],
        unit: "per month",
      },
    },
  },
  // ─── 月費訂閱 ───
  {
    sku: "care-basic",
    type: "monthly",
    price: 2990,
    marketRange: { "zh-TW": "行情 NT$1,500–5,000/月", en: "Market NT$1.5k–5k/mo" },
    i18n: {
      "zh-TW": {
        label: "月費方案",
        name: "安心維護",
        desc: "網站不只要上線，更要一直健康地跑。",
        features: [
          "主機代管＋SSL 憑證",
          "每日自動備份",
          "安全更新與監控告警",
          "內容小幅修改每月 2 次",
        ],
        unit: "每月",
      },
      en: {
        label: "Monthly Care",
        name: "Essential Care",
        desc: "A website should stay healthy, not just go live.",
        features: [
          "Hosting + SSL certificate",
          "Daily automated backups",
          "Security updates & uptime alerts",
          "2 small content edits / month",
        ],
        unit: "per month",
      },
    },
  },
  {
    sku: "care-growth",
    type: "monthly",
    price: 5990,
    featured: true,
    marketRange: { "zh-TW": "行情 NT$3,000–10,000/月", en: "Market NT$3k–10k/mo" },
    i18n: {
      "zh-TW": {
        label: "月費方案",
        name: "成長維護",
        desc: "維護之外，每個月持續讓網站變得更好。",
        features: [
          "含「安心維護」全部項目",
          "每月 4 小時修改／新功能開發",
          "SEO＋AI 搜尋（GEO）健檢調整",
          "每月數據報告與建議",
        ],
        unit: "每月",
      },
      en: {
        label: "Monthly Care",
        name: "Growth Care",
        desc: "Beyond maintenance — your site keeps improving every month.",
        features: [
          "Everything in Essential Care",
          "4 hours of changes/features monthly",
          "SEO + AI search (GEO) tuning",
          "Monthly analytics report & advice",
        ],
        unit: "per month",
      },
    },
  },
  {
    sku: "care-ai",
    type: "monthly",
    price: 8990,
    marketRange: { "zh-TW": "行情 NT$10,000+/月", en: "Market NT$10k+/mo" },
    i18n: {
      "zh-TW": {
        label: "月費方案",
        name: "AI 託管",
        desc: "AI 客服與自動化流程的全包式營運託管。",
        features: [
          "AI 客服／自動化流程監控",
          "含每月 AI API 用量額度",
          "知識庫內容更新",
          "流程異常即時處理",
          "每月成效報告",
        ],
        unit: "每月",
      },
      en: {
        label: "Monthly Care",
        name: "AI Operations",
        desc: "Fully managed operations for your AI agents and automations.",
        features: [
          "AI agent / workflow monitoring",
          "Monthly AI API usage credits included",
          "Knowledge base updates",
          "Immediate incident response",
          "Monthly performance report",
        ],
        unit: "per month",
      },
    },
  },
];

export const getProduct = (sku: string) => PRODUCTS.find((p) => p.sku === sku);
// 促銷方案由 promoProducts() 獨立呈現，故從兩個常規清單排除（見 ProductGroup 註解）
export const oneTimeProducts = () =>
  PRODUCTS.filter((p) => p.type === "onetime" && !p.group);
export const monthlyProducts = () =>
  PRODUCTS.filter((p) => p.type === "monthly" && !p.group);
export const promoProducts = () => PRODUCTS.filter((p) => p.group === "promo");

// 反查：哪些一次性方案建議搭配此維護（用於定價區「適用方案」標註）
export const plansUsingCare = (careSku: string) =>
  PRODUCTS.filter((p) => p.type === "onetime" && p.recommendedCareSku === careSku);

/**
 * 含建置的訂單，其維護方案的最短承諾期（月）。
 * 建置以遠低於行情的價格交付，後續維護是對價的一部分——這是收月費而非一次性接案的支點。
 * 單購維護（無建置）不綁約；促銷方案有自己的承諾期（見 PROMO_PLANS）。
 */
export const BUILD_COMMIT_MONTHS = 12;

// ─── 維護必選規則 ───
//
// 建置案交付後就得有人顧：主機、備份、安全更新都是持續成本，
// 所以車上有建置方案時，必須擇一維護方案，且自第一個月起計費。
// 網站健檢（無 recommendedCareSku）是一次性報告，不在此限。
const buildsNeedingCare = (skus: string[]) =>
  skus
    .map(getProduct)
    .filter((p): p is Product => !!p && p.type === "onetime" && !!p.recommendedCareSku);

/** 車上的建置方案是否要求搭配維護 */
export const careRequired = (skus: string[]) => buildsNeedingCare(skus).length > 0;

/**
 * 車上建置方案可選的維護方案。促銷建置（Launch）綁定促銷維護，
 * 不與正式月費方案混選，否則創始價會被一般方案的價格帶稀釋。
 */
export const careOptionsFor = (skus: string[]): Product[] => {
  const builds = buildsNeedingCare(skus);
  if (builds.length === 0) return [];
  if (builds.some((p) => p.group === "promo")) {
    return PRODUCTS.filter((p) => p.type === "monthly" && p.group === "promo");
  }
  return monthlyProducts();
};

/**
 * 促銷建置與正式建置不得同車。
 *
 * careOptionsFor 在有促銷建置時只會回促銷維護（NT$2,000/月），
 * 若車上同時有商務網站（正常搭配成長維護 NT$5,990/月），等於用促銷價
 * 買到正式方案的維護——這是定價漏洞，不是彈性。健檢（無 recommendedCareSku）
 * 是獨立的一次性報告，不受此限。
 */
export const mixedBuildConflict = (skus: string[]) => {
  const builds = buildsNeedingCare(skus);
  return builds.some((p) => p.group === "promo") && builds.some((p) => !p.group);
};

/** 預設推薦的維護方案：以車上最高價的建置方案為準 */
export const recommendedCareFor = (skus: string[]): string | undefined =>
  buildsNeedingCare(skus).sort((a, b) => b.price - a.price)[0]?.recommendedCareSku;

// ─── 首波創始客戶計畫：方案組合 ───
//
// launch-setup 與 launch-care 是「結帳用的 SKU」，不是「客戶看到的方案」。
// 客戶要選的是付款方式（付建置費綁短約 vs 零元建置綁長約），交付內容完全相同，
// 所以定價區把共通內容列一次，再讓客戶二選一——而不是渲染成兩張獨立商品卡。
export interface PromoPlan {
  id: string;
  skus: string[]; // 選擇此方案時要加進購物車的 SKU
  setup: number; // 建置費（未稅）
  monthly: number; // 月費（未稅）
  termMonths: number;
  featured?: boolean;
  i18n: {
    "zh-TW": { name: string; tagline: string; terms: string[] };
    en: { name: string; tagline: string; terms: string[] };
  };
}

/** 兩個方案共通的交付內容（只列一次，避免看起來像兩個不同產品） */
export const PROMO_INCLUDES: { "zh-TW": string[]; en: string[] } = {
  "zh-TW": [
    "5 頁以內形象官網，全客製設計",
    "專屬表單後台＋新訊即時 Email 通知",
    "子網域與 SSL 憑證（隨時可改綁自有網域）",
    "GA4、sitemap、結構化資料基礎建置",
    "主機代管、每日自動備份與監控告警",
    "每月 1 小時內容修改（文字、圖片、公告）",
    "資料隨時可 CSV 匯出，解約提供 6 個月轉址",
    "資料齊全後 10 個工作天上線",
  ],
  en: [
    "Up to 5 pages, fully custom design",
    "Private form dashboard + instant email alerts",
    "Subdomain with SSL (custom domain any time)",
    "GA4, sitemap and structured data",
    "Hosting, daily backups and uptime monitoring",
    "1 hour of content edits every month",
    "Export your data any time; 6-month redirect on exit",
    "Live in 10 business days once content is ready",
  ],
};

export const PROMO_PLANS: PromoPlan[] = [
  {
    id: "founding",
    skus: ["launch-setup", "launch-care"],
    setup: 10000,
    monthly: 2000,
    termMonths: 12,
    featured: true,
    i18n: {
      "zh-TW": {
        name: "創始價",
        tagline: "建置費一次付清，綁約期較短",
        terms: [
          "最短承諾 12 個月",
          "建置費一次付清，維護月費自第一個月起扣",
          "期滿轉月繳，30 天前通知即可終止",
        ],
      },
      en: {
        name: "Founding Rate",
        tagline: "Pay the build fee up front, shorter commitment",
        terms: [
          "12-month minimum term",
          "Build fee paid up front; care billing starts in month one",
          "Rolls to monthly after; cancel with 30 days' notice",
        ],
      },
    },
  },
  {
    id: "zero-setup",
    skus: ["launch-care"],
    setup: 0,
    monthly: 2000,
    termMonths: 24,
    i18n: {
      "zh-TW": {
        name: "零元啟動",
        tagline: "開辦成本為零，以較長的承諾期交換",
        terms: [
          "最短承諾 24 個月",
          "無建置費，月費自當月起扣",
          "期滿免費移交網站原始碼",
        ],
      },
      en: {
        name: "Zero Setup",
        tagline: "No upfront cost, in exchange for a longer term",
        terms: [
          "24-month minimum term",
          "No build fee; billing starts this month",
          "Source code handed over free at the end of term",
        ],
      },
    },
  },
];

export const promoPlanTotal = (p: PromoPlan) => p.setup + p.monthly * p.termMonths;

/**
 * 反查訂單屬於哪個促銷方案，用來把「最短承諾期」寫進訂閱紀錄。
 * 兩個方案共用 launch-care，差別在有沒有 launch-setup，
 * 故取「所有 SKU 都在訂單裡」之中條件最嚴格（SKU 最多）的那個。
 */
export const promoPlanForSkus = (skus: string[]): PromoPlan | undefined =>
  PROMO_PLANS.filter((p) => p.skus.every((s) => skus.includes(s))).sort(
    (a, b) => b.skus.length - a.skus.length
  )[0];

// ─── 單項功能參考價（à la carte）───
// 客戶可自由挑選組合；因客製範圍會影響價格，最終以諮詢確認報價為準。
// 價格為未稅參考價（TWD），可自由調整。
export interface Addon {
  price: number;
  i18n: { "zh-TW": { name: string; desc: string }; en: { name: string; desc: string } };
}
export const ADDONS: Addon[] = [
  {
    price: 12000,
    i18n: {
      "zh-TW": { name: "金流串接", desc: "綠界／藍新，含定期定額" },
      en: { name: "Payment gateway", desc: "ECPay / NewebPay, incl. recurring" },
    },
  },
  {
    price: 8000,
    i18n: {
      "zh-TW": { name: "電子發票串接", desc: "開立、作廢、寄送一條龍" },
      en: { name: "E-invoice", desc: "Issue, void and send" },
    },
  },
  {
    price: 20000,
    i18n: {
      "zh-TW": { name: "會員／登入系統", desc: "註冊、登入、權限、個人頁" },
      en: { name: "Membership / auth", desc: "Sign-up, login, roles, profile" },
    },
  },
  {
    price: 16000,
    i18n: {
      "zh-TW": { name: "線上預約系統", desc: "時段、通知、後台管理" },
      en: { name: "Booking system", desc: "Slots, notifications, admin" },
    },
  },
  {
    price: 22000,
    i18n: {
      "zh-TW": { name: "Telegram／LINE 憑證入帳", desc: "拍照上傳，AI 抽取自動記錄" },
      en: { name: "Telegram/LINE receipt entry", desc: "Photo upload, AI auto-booking" },
    },
  },
  {
    price: 9000,
    i18n: {
      "zh-TW": { name: "自動報表", desc: "Sheets／Excel／Email 定時寄送" },
      en: { name: "Automated reports", desc: "Sheets / Excel / email on schedule" },
    },
  },
  {
    price: 25000,
    i18n: {
      "zh-TW": { name: "AI 知識庫問答（RAG）", desc: "用你的文件訓練的問答" },
      en: { name: "AI knowledge base (RAG)", desc: "Q&A trained on your docs" },
    },
  },
  {
    price: 14000,
    i18n: {
      "zh-TW": { name: "後台權限與角色管理", desc: "多帳號、分權、操作紀錄" },
      en: { name: "Roles & permissions", desc: "Multi-user, access control, logs" },
    },
  },
  {
    price: 10000,
    i18n: {
      "zh-TW": { name: "第三方 API 串接", desc: "每支既有系統／服務串接" },
      en: { name: "Third-party API", desc: "Per external system integration" },
    },
  },
  {
    price: 12000,
    i18n: {
      "zh-TW": { name: "多語系網站", desc: "雙語或多語切換、內容管理" },
      en: { name: "Multilingual site", desc: "Multi-language switch & content" },
    },
  },
];
