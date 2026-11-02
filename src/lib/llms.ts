import { COMPANY, LINE_URL, SITE } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";
import { SERVICES, filledCopy, servicePath } from "@/lib/services";
import { monthlyProducts, oneTimeProducts, fmt } from "@/lib/products";

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
