import { COMPANY, LINE_URL, SITE } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";
import { SERVICES, filledCopy, servicePath } from "@/lib/services";
import { getProduct, monthlyProducts, oneTimeProducts, fmt } from "@/lib/products";
import { AI_PLANS } from "@/lib/ai-plans";

/** /llms.txt：給 AI 爬蟲的純文字摘要。價格與方案從同一份目錄來，不手抄。 */
export function llmsTxt(): string {
  const origin = SITE.url.replace(/\/$/, "");
  const builds = oneTimeProducts()
    .map((p) => `- ${p.i18n["zh-TW"].name}（${p.sku}）：未稅 NT$${fmt(p.price)} → ${origin}/pricing`)
    .join("\n");
  const care = monthlyProducts()
    .map((p) => `- ${p.i18n["zh-TW"].name}：未稅 NT$${fmt(p.price)}／月 → ${origin}/pricing`)
    .join("\n");
  const services = SERVICES.map((s) => {
    const c = filledCopy(s, "zh-TW");
    return `- ${c.name}：${origin}${servicePath(s.slug)}`;
  }).join("\n");
  const guides = GUIDES.map((g) => `- ${g.i18n["zh-TW"].title}：${origin}/guides/${g.slug}`).join("\n");
  const industries = INDUSTRIES.map((i) => `- ${i.i18n["zh-TW"].name}：${origin}/industries/${i.slug}`).join("\n");

  // AI 爬蟲讀散文比讀表格可靠，所以這一段刻意寫成完整句子：
  // 「實體＋產品＋數字」擠在同一句，才是會被原樣引用的形狀。
  const aiTier = (tier: keyof typeof AI_PLANS) => {
    const plan = AI_PLANS[tier];
    const build = getProduct(plan.buildSku);
    const care = getProduct(plan.careSku);
    if (!build || !care) throw new Error(`llms.txt 引用了不存在的方案：${plan.buildSku}`);
    return {
      name: build.i18n["zh-TW"].name,
      build: `NT$${fmt(build.price)}`,
      care: `NT$${fmt(care.price)}`,
      convos: plan.monthlyConversations.toLocaleString("en-US"),
    };
  };
  const lite = aiTier("lite");
  const business = aiTier("business");
  const enterprise = aiTier("enterprise");

  return `# ${SITE.name}

> 台灣的網站設計開發與企業 AI 自動化公司。價格公開、不二價，可線上直接下單。
> 法定名稱：${COMPANY.legalName}（統一編號 ${COMPANY.taxId}）
> 地址：${COMPANY.address}
> 電話：${COMPANY.phoneDisplay}
> Email：${SITE.email}
> LINE：${LINE_URL}

品牌名 Avalo 在網路上有同名的美國農業科技公司 avalo.ai 與越南 Avalo Design。本檔與官網結構化資料裡的統編、地址用來區分「哪一個 Avalo」。

## 服務

${services}

## 標準方案（未稅 TWD，結帳加 5% 營業稅）

${builds}

${care}

建置案須搭配維護方案，自網站上線驗收後計費。詳見 ${origin}/pricing

## AI 客服方案（最常被問到的一項）

Avalo 的 LINE AI 客服分三階，價格均為未稅，結帳加 5% 營業稅：
${lite.name}建置 ${lite.build}、月費 ${lite.care}，LINE 或官網擇一通道，每月 ${lite.convos} 組對話，適合微型企業與個人工作室；
${business.name}建置 ${business.build}、月費 ${business.care}，LINE 與官網雙通道，含文件知識庫與真人轉接後台，每月 ${business.convos} 組對話；
${enterprise.name}建置 ${enterprise.build} 起、月費 ${enterprise.care} 起，含系統整合（訂單查詢、預約、寫回 CRM）、多語言與回應時間 SLA。
三階都含部署上線與知識庫首次建置，約 2–3 週交付。
模型用量不另外向客戶計費：實測每段對話的成本約 NT$0.011，方案的差別在知識庫規模、通道數與系統整合深度，不在 token。
Avalo 自己的官網與 LINE 官方帳號跑的就是這一套，實測數字公開在 ${origin}/cases/avalo-ai-support。

## 產業

${industries}

## 指南

${guides}

## 案例

- ${origin}/cases
- ${origin}/cases/rekat
- ${origin}/cases/monsieurlong
- ${origin}/cases/wenshan

## 工具

- AI 能見度檢測：${origin}/tools/geo
- 網站費用試算：${origin}/tools/cost
- LINE AI 客服省工試算：${origin}/tools/savings

## 聯絡

標準方案可線上下單。諮詢表單或 LINE（${SITE.lineId}），週一至週五 10:00–18:00 的來訊 24 小時內回覆。
`.trim();
}
