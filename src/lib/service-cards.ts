import type { DoodleName } from "@/lib/doodle";
import { ADDONS, fmt, getProduct } from "@/lib/products";

// 服務卡片：服務索引頁與首頁共用的一份資料（圖示、一句話、起價、交期）。
//
// 卡片只放「一句話＋起價＋交期」，細節留給各服務頁。
// 起價不手抄：from 指到 products.ts 的方案（sku）或單項功能（addon），對不到就讓 build 失敗。
// 交期取自 services.ts 各服務的 timeline，沒有固定交期的不寫。
export interface ServiceCard {
  slug: string;
  icon: DoodleName;
  from: { sku: string } | { addon: string };
  fixed?: boolean; // 單一定價，不標「起」
  zh: { blurb: string; time?: string };
  en: { blurb: string; time?: string };
}

export const SERVICE_GROUPS: { zh: { name: string; note: string }; en: { name: string; note: string }; cards: ServiceCard[] }[] = [
  {
    zh: { name: "蓋網站", note: "門面、賣場、收款" },
    en: { name: "Build", note: "Storefront, shop, payments" },
    cards: [
      {
        slug: "website",
        icon: "browser",
        from: { sku: "web-basic" },
        zh: { blurb: "全客製、不套版，5 頁以內，含部署上線。", time: "2–3 週" },
        en: { blurb: "Fully custom, up to five pages, deployed.", time: "2–3 wks" },
      },
      {
        slug: "ecommerce",
        icon: "cart",
        from: { sku: "web-commerce" },
        zh: { blurb: "購物車或預約、金流與訂單後台一次到位。", time: "3–5 週" },
        en: { blurb: "Cart or booking, payments and an order dashboard.", time: "3–5 wks" },
      },
      {
        slug: "payment",
        icon: "card",
        from: { addon: "payment" },
        zh: { blurb: "綠界、藍新；信用卡一次付清與定期定額。" },
        en: { blurb: "ECPay and NewebPay; one-off and recurring cards." },
      },
    ],
  },
  {
    zh: { name: "導入 AI", note: "客服、流程、搜尋能見度" },
    en: { name: "Add AI", note: "Support, workflows, visibility" },
    cards: [
      {
        slug: "line-ai-chatbot",
        icon: "chat",
        from: { sku: "ai-chatbot-lite" },
        zh: { blurb: "用你的 FAQ 與價目，全天候回覆客人。", time: "2–3 週" },
        en: { blurb: "Answers from your FAQ and prices, after hours too.", time: "2–3 wks" },
      },
      {
        slug: "ai-automation",
        icon: "gears",
        from: { sku: "automation" },
        zh: { blurb: "訂單、對帳、報表，重複的事交給系統跑。" },
        en: { blurb: "Orders, reconciliation, reports — run by the system." },
      },
      {
        slug: "geo",
        icon: "search",
        from: { sku: "site-rescue" },
        zh: { blurb: "讓 ChatGPT 與 Google 都找得到你。" },
        en: { blurb: "Be found by ChatGPT, Gemini and Google." },
      },
    ],
  },
  {
    zh: { name: "顧網站", note: "上線之後有人看著" },
    en: { name: "Care", note: "Looked after once live" },
    cards: [
      {
        slug: "maintenance",
        icon: "shield",
        from: { sku: "care-basic" },
        zh: { blurb: "主機、SSL、每日備份與安全更新。" },
        en: { blurb: "Hosting, SSL, daily backups and security updates." },
      },
      {
        slug: "website-audit",
        icon: "pulse",
        from: { sku: "site-rescue" },
        fixed: true,
        zh: { blurb: "檢查速度、SEO 與資安，交書面報告。", time: "一週內" },
        en: { blurb: "Speed, SEO, security and AI visibility, in writing.", time: "1 week" },
      },
    ],
  },
];

export function cardPrice(from: ServiceCard["from"]): { price: number; monthly: boolean } {
  if ("sku" in from) {
    const p = getProduct(from.sku);
    if (!p) throw new Error(`服務卡片引用了不存在的方案：${from.sku}`);
    return { price: p.price, monthly: p.type === "monthly" };
  }
  const a = ADDONS.find((x) => x.id === from.addon);
  if (!a) throw new Error(`服務卡片引用了不存在的單項功能：${from.addon}`);
  return { price: a.price, monthly: false };
}

/** 卡片上的價格字串：「NT$39,000 起」「NT$2,990／月 起」「NT$9,900」 */
export function cardPriceLabel(c: ServiceCard, zh: boolean): { amount: string; suffix: string } {
  const { price, monthly } = cardPrice(c.from);
  return {
    amount: `NT$${fmt(price)}`,
    suffix: zh
      ? `${monthly ? "／月" : ""}${c.fixed ? "" : " 起"}`
      : `${c.fixed ? "" : "+"}${monthly ? " /mo" : ""}`,
  };
}

/** 依原本的分組順序攤平成一列（首頁用） */
export const SERVICE_CARDS: ServiceCard[] = SERVICE_GROUPS.flatMap((g) => g.cards);
