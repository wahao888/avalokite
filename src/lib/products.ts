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
  // ─── 限時零元啟動（限量促銷）───
  // 「0 元建置」不是獨立 SKU：單購 launch-care（無一次性品項）時，
  // checkout 的 hasBuild=false 分支會讓定期定額當月起扣，正是該方案要的行為。
  //
  // launch-setup 已不對外銷售（定價頁只剩零元啟動一種付法），保留於此僅為了讓
  // 既有訂單仍能以 getProduct() 解析出品名與價格，勿刪。
  {
    sku: "launch-setup",
    type: "onetime",
    price: 10000,
    group: "promo",
    recommendedCareSku: "launch-care",
    badge: { "zh-TW": "限量 10 席", en: "10 seats only" },
    promoNote: {
      "zh-TW": "限時檔期名額；此價於訂閱存續期間鎖定，不隨日後定價調整。",
      en: "Limited-run seats. Your rate stays locked for as long as the subscription runs.",
    },
    marketRange: {
      "zh-TW": "Avalo 標準形象官網 NT$39,000",
      en: "Avalo Brand Website NT$39,000",
    },
    i18n: {
      "zh-TW": {
        label: "限時啟動方案",
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
        label: "Limited-Time Launch Offer",
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
  // 席次保留金。零元啟動唯一的一次性品項，也是「建置費 0 元」與「先收錢」之間的解法。
  //
  // 為什麼不是零元下單：0 元建置代表本公司先墊 10 個工作天的工，下單零成本會招來
  // 「先訂再說」然後失聯的人，做到一半血本無歸。保留金把承諾變成實物。
  // 為什麼不是首月月費：月費買的是主機、備份、監控與改稿，網站還沒上線時這些服務
  // 一項都還沒發生，把它記成月費就是收了沒有對價的錢——名目錯了，條款上站不住腳。
  //
  // 所以它是「保留席次」的對價，並於網站上線驗收後全額折抵首期月費：
  // 承諾期 24 期 = 保留金 1 期 + 定期定額 23 期，總額仍是 2,000 × 24，一毛不多收。
  {
    sku: "launch-deposit",
    type: "onetime",
    price: 2000,
    group: "promo",
    recommendedCareSku: "launch-care",
    badge: { "zh-TW": "折抵首期月費", en: "Credited to month one" },
    promoNote: {
      "zh-TW": "保留本檔名額；網站上線驗收後全額折抵首期月費。若本公司未能如期交付，全額退還。",
      en: "Holds your seat and is credited in full to your first month. Fully refunded if we fail to deliver.",
    },
    marketRange: {
      "zh-TW": "等同一期月費 NT$2,000，非額外費用",
      en: "Equals one month (NT$2,000) — not an extra charge",
    },
    i18n: {
      "zh-TW": {
        label: "限時啟動方案",
        name: "席次保留金",
        desc: "保留本檔名額並排入製作排程；網站上線驗收後全額折抵首期月費。",
        features: [
          "建置費仍為 0 元，此筆全額折抵月費",
          "下單後排入製作排程，資料齊全後 10 個工作天上線",
          "網站上線驗收後才開始計收月費",
          "若本公司未能如期交付，全額退還",
        ],
        unit: "一次性",
      },
      en: {
        label: "Limited-Time Launch Offer",
        name: "Seat deposit",
        desc: "Holds your seat and books production; credited in full to your first month once the site is live and accepted.",
        features: [
          "Build fee stays at zero — this is credited to your monthly fee",
          "Books production; live in 10 business days once content is ready",
          "Monthly billing starts only after the site is live and accepted",
          "Fully refunded if we fail to deliver",
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
    badge: { "zh-TW": "限時價鎖定", en: "Rate locked" },
    promoNote: {
      "zh-TW": "零元啟動：免建置費，承諾 24 個月，月費自網站上線驗收後起扣。",
      en: "Zero setup: no build fee, 24-month term, billing starts once the site is live.",
    },
    marketRange: { "zh-TW": "行情 NT$1,500–5,000/月", en: "Market NT$1.5k–5k/mo" },
    i18n: {
      "zh-TW": {
        label: "限時啟動方案",
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
        label: "Limited-Time Launch Offer",
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
 * 不與正式月費方案混選，否則限時價會被一般方案的價格帶稀釋。
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

// ─── 限時零元啟動：方案組合 ───
//
// launch-care 是「結帳用的 SKU」，不是「客戶看到的方案」。定價區呈現的是一個
// 完整方案（交付內容 ＋ 付款條件），選擇後才把對應 SKU 丟進購物車。
// PROMO_PLANS 保留陣列結構：日後要再開第二種付法時，加一筆即可自動並排。
export interface PromoPlan {
  id: string;
  skus: string[]; // 選擇此方案時要加進購物車的 SKU
  setup: number; // 建置費（未稅）
  /**
   * 下單時收取的席次保留金（未稅）。與建置費是兩件事：
   * 建置費是「做網站的錢」，保留金是「保留名額的錢」，且於上線驗收後折抵首期月費。
   * 因此保留金不計入承諾期總額（promoPlanTotal）——它本來就是那 24 期裡的第 1 期。
   */
  deposit: number;
  monthly: number; // 月費（未稅）
  termMonths: number;
  featured?: boolean;
  i18n: {
    "zh-TW": { name: string; tagline: string; terms: string[] };
    en: { name: string; tagline: string; terms: string[] };
  };
}

/** 方案交付內容（與付款條件分開列，讓「拿到什麼」先於「怎麼付」被讀到） */
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
    id: "zero-setup",
    skus: ["launch-deposit", "launch-care"],
    setup: 0,
    deposit: 2000,
    monthly: 2000,
    termMonths: 24,
    featured: true,
    i18n: {
      "zh-TW": {
        name: "零元啟動",
        tagline: "免付建置費，官網直接開起來",
        terms: [
          "最短承諾 24 個月",
          "無建置費；下單付 NT$2,000 席次保留金",
          "網站上線驗收後才開始月費，保留金全額折抵首期",
          "期滿免費移交網站原始碼",
        ],
      },
      en: {
        name: "Zero Setup",
        tagline: "No build fee — get the site live now",
        terms: [
          "24-month minimum term",
          "No build fee; a NT$2,000 seat deposit at checkout",
          "Monthly billing starts once the site is live; the deposit covers month one",
          "Source code handed over free at the end of term",
        ],
      },
    },
  },
];

/**
 * 承諾期內客戶實際付出的總額。
 * 保留金刻意不加進來：它是那 24 期裡的第 1 期，加了就變成重複計算、對外多報一期。
 */
export const promoPlanTotal = (p: PromoPlan) => p.setup + p.monthly * p.termMonths;

/**
 * 反查訂單屬於哪個促銷方案，用來把「最短承諾期」寫進訂閱紀錄。
 * 取「所有 SKU 都在訂單裡」之中條件最嚴格（SKU 最多）的那個，
 * 這樣既有的 launch-setup + launch-care 舊訂單也仍能正確對應。
 */
export const promoPlanForSkus = (skus: string[]): PromoPlan | undefined =>
  PROMO_PLANS.filter((p) => p.skus.every((s) => skus.includes(s))).sort(
    (a, b) => b.skus.length - a.skus.length
  )[0];

/**
 * 促銷維護不得單獨結帳。
 *
 * launch-care 是 NT$2,000/月——遠低於同級的安心維護 NT$2,990——那個價差是用
 * 24 個月承諾期換來的，而承諾期綁在促銷建置上。少了促銷建置，promoPlanForSkus
 * 反查不到方案、termMonths 會是 null，等於用促銷價買到一份沒有綁約的維護。
 * 前端一律成組加入購物車，這條是伺服器端擋繞過用的。
 */
export const promoCareNeedsBuild = (skus: string[]) => {
  const has = (t: ProductType) =>
    skus.map(getProduct).some((p) => p?.group === "promo" && p.type === t);
  return has("monthly") && !has("onetime");
};

/**
 * 促銷方案的席次保留金相當於幾期月費。
 *
 * 這個數字是「折抵首期」唯一的實作方式，也是最容易算錯的地方：
 * 綠界定期定額在**授權當下就扣第一期**，所以上線後若照 24 個月授權，
 * 客戶會被扣 24 期，加上下單時的保留金就變成 25 期——保留金等於沒折抵，
 * 反而多收了一期。承諾期必須扣掉保留金已涵蓋的期數（見 markLaunched）。
 *
 * 用整除而非硬寫 1：日後若把保留金調成兩期，這裡不必再改。
 */
export const prepaidPeriodsFor = (skus: string[]): number => {
  const plan = promoPlanForSkus(skus);
  if (!plan || plan.monthly <= 0 || plan.deposit <= 0) return 0;
  return Math.floor(plan.deposit / plan.monthly);
};

// ─── 承諾期內提前終止的補償 ───
//
// 為什麼不是「補付剩餘月份的月費」（原本的寫法）：客戶第 3 個月走人，那是 21 × 2,000
// ＝ 42,000。這個數字大到你不會真的去請求、客戶也不會給，等於沒有條款。
//
// 換成「補付未分攤完的建置費」就講得通：零元啟動是把標準建置費 NT$39,000 攤進
// 24 個月，提前走就補還沒攤完的那一段。金額小、開得了口、收得到，而且客戶一聽就懂。
// 階梯化（而非逐月線性）是為了讓客戶自己能算、也讓條款寫得出具體數字。
export const EARLY_EXIT_TIERS = [
  { fromMonth: 0, fee: 30000 },
  { fromMonth: 6, fee: 20000 },
  { fromMonth: 12, fee: 10000 },
  { fromMonth: 18, fee: 5000 },
  { fromMonth: 24, fee: 0 },
] as const;

/** 已完成 monthsElapsed 期時提前終止，應補付的建置費差額（未稅 TWD） */
export const earlyExitFee = (monthsElapsed: number): number => {
  const m = Math.max(0, Math.floor(monthsElapsed));
  // 由後往前找第一個門檻，避免忘記維護排序時算出比較貴的級距
  return [...EARLY_EXIT_TIERS].reverse().find((t) => m >= t.fromMonth)!.fee;
};

/** 條款與客戶自助頁共用的級距說明，確保文案與計算永遠是同一組數字 */
export const earlyExitTierLabels = (zh: boolean): string[] =>
  EARLY_EXIT_TIERS.map((t, i) => {
    const next = EARLY_EXIT_TIERS[i + 1];
    const range = zh
      ? next
        ? `已完成 ${t.fromMonth}–${next.fromMonth - 1} 期`
        : `已完成 ${t.fromMonth} 期以上`
      : next
        ? `Months ${t.fromMonth}–${next.fromMonth - 1}`
        : `Month ${t.fromMonth} onwards`;
    return zh
      ? `${range}：補付 NT$${fmt(t.fee)}`
      : `${range}: NT$${fmt(t.fee)}`;
  });

// ─── 單項功能參考價（à la carte）───
// 客戶可自由挑選組合；因客製範圍會影響價格，最終以諮詢確認報價為準。
// 價格為未稅參考價（TWD），可自由調整。
export interface Addon {
  price: number;
  i18n: { "zh-TW": { name: string; desc: string }; en: { name: string; desc: string } };
}
export const ADDONS: Addon[] = [
  {
    // 代客申請而不是叫客戶自己去買：多數店家不會操作 DNS，也不該為了這件事卡住。
    // 登記人一律填客戶本人——客戶站掛在 Avalo 的網域下，這條是「不綁架你」的具體
    // 證明，不是漂亮話（搭配服務條款的資料主權與解約 6 個月轉址）。
    price: 3000,
    i18n: {
      "zh-TW": {
        name: "自有網域申請與綁定",
        desc: "代為申請與設定，登記你名下；一般網域年費含在月費內",
      },
      en: {
        name: "Custom domain setup",
        desc: "We register and configure it, in your name; standard renewal fees covered by your plan",
      },
    },
  },
  {
    // 方案本身已含 GA4／sitemap／結構化資料，這包是「再往上」的部分：
    // 關鍵字怎麼選、頁面怎麼改、Search Console 怎麼看。
    price: 8000,
    i18n: {
      "zh-TW": { name: "SEO 起步包", desc: "關鍵字規劃、頁面 meta 與結構優化、Search Console 設定" },
      en: { name: "SEO starter", desc: "Keyword plan, on-page meta & structure, Search Console setup" },
    },
  },
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
