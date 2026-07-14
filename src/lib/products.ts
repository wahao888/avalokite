// Avalo 服務目錄 — 唯一商品資料來源（價格皆為未稅 TWD）
// 結帳時加 5% 營業稅：Math.round(price * 1.05)

export type ProductType = "onetime" | "monthly";

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
  // 一次性方案的建議接續維護：建置已含首月，第二個月起可選訂閱此月費方案
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
          "含部署上線與第一個月維護",
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
          "Deployment + first month of care included",
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
          "含部署上線與第一個月維護",
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
          "Deployment + first month of care included",
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
          "含部署、知識庫首次建置與首月託管",
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
          "Deployment, initial KB setup + first month included",
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
          "含部署上線與首月維運",
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
          "Deployment + first month of care included",
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
export const oneTimeProducts = () => PRODUCTS.filter((p) => p.type === "onetime");
export const monthlyProducts = () => PRODUCTS.filter((p) => p.type === "monthly");

// 反查：哪些一次性方案建議搭配此維護（用於定價區「適用方案」標註）
export const plansUsingCare = (careSku: string) =>
  PRODUCTS.filter((p) => p.type === "onetime" && p.recommendedCareSku === careSku);

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
