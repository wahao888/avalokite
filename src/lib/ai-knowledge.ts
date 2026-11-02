// AI 客服知識庫 —— 組出要餵給模型的事實文字。
//
// 價格、方案與加購一律由 products.ts 當場算出來，不手抄一份。
// 手抄的下場是調價後客服還在報舊價，而這是會讓客戶拿去當承諾的數字。
// 需要人工維護的只有 FAQ 與接待規則（本檔下半部），那些本來就沒有程式來源。

import { PRODUCTS, ADDONS, fmt, withTax, type Product } from "@/lib/products";
import { PROMO_WINDOW, currentDeadline, promoOpen, seatsLeft } from "@/lib/promo-window";
import { SITE, COMPANY } from "@/lib/site";

const zh = (p: Product) => p.i18n["zh-TW"];

function productLines(): string {
  return PRODUCTS.map((p) => {
    const t = zh(p);
    const unit = p.type === "monthly" ? "／月" : "（一次性）";
    const care = p.recommendedCareSku
      ? `　必須搭配維護方案：${p.recommendedCareSku}（建置費不含任何維護月份，維護自第一個月起計費）`
      : "";
    return [
      `■ ${t.name}（sku: ${p.sku}）`,
      `　未稅 NT$${fmt(p.price)}${unit}；含稅 NT$${fmt(withTax(p.price))}`,
      `　${t.desc}`,
      `　內容：${t.features.join("、")}`,
      `　${p.marketRange["zh-TW"]}`,
      care,
    ]
      .filter(Boolean)
      .join("\n");
  }).join("\n\n");
}

function addonLines(): string {
  return ADDONS.map((a) => {
    const t = a.i18n["zh-TW"];
    return `・${t.name}　未稅 NT$${fmt(a.price)}　—— ${t.desc}`;
  }).join("\n");
}

// 促銷檔期會過期，所以每次對話即時判斷，不在模組載入時固定下來。
function promoLines(): string {
  if (!promoOpen()) {
    return "目前沒有進行中的促銷檔期。客人問起促銷時，據實說明檔期已結束，改以正式方案報價。";
  }
  const left = seatsLeft();
  return [
    `目前有進行中的限時方案，剩餘 ${left} 席（共 ${PROMO_WINDOW.seatsTotal} 席）。`,
    `報名截止：${new Date(currentDeadline()).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}。`,
    "席次與截止日由網站即時計算，不要自行加碼或延長。",
  ].join("\n");
}

// 需要人工維護的部分：程式裡沒有這些事實的來源。
const HANDBOOK = `
【公司】
${COMPANY.brand}（登記名稱：${COMPANY.legalName}，統編 ${COMPANY.taxId}）
地址：${COMPANY.address}
電話：${COMPANY.phoneDisplay}
Email：${SITE.email}
官網：https://avalokite.xyz

【我們做什麼】
企業與個人品牌的網站建置、電商、企業 AI 自動化與智能客服。
設計、開發、部署、維運一站式交付，價格全部公開、不二價，線上可直接下單。

【交付流程】
1. 線上下單或來訊諮詢，確認需求與方案
2. 付款後啟動，提供素材（文案、圖片、商品資料）
3. 設計與開發，期間可看進度網址
4. 驗收與上線，含部署與網域設定
5. 上線後由維護方案承接：主機、備份、監控、內容更新

【一般交期】
形象官網約 2–3 週；電商約 3–5 週；AI 客服約 2–3 週。
交期自「素材齊備」起算，不是自付款日起算。實際排程以確認時告知為準。

【付款】
線上刷卡（綠界），支援一次付清與定期定額。所有標價皆為未稅，結帳時加 5% 營業稅。
可開立統編發票。

【維護方案】
所有建置方案都必須搭配一份維護方案，這不是加購選項。
網站要有人看著主機、憑證、備份與更新，沒有維護的網站三個月後就會開始出事。

【資料主權】
客戶的網域登記在客戶本人名下，資料屬於客戶。
解約後提供 6 個月轉址，不綁架客戶的流量。
`.trim();

// 接待規則：講法和界線。模型的語氣由這裡決定。
const CONDUCT = `
【身分】
你是 ${SITE.name} 的線上客服。用繁體中文回答，語氣專業、直接、簡潔。
以「我們」自稱，不要說「我是 AI」以外的身分設定，也不要扮演工程師個人。

【怎麼回】
・先回答問題本身，不要用「感謝您的詢問」開場
・報價一律引用上面的數字，未稅／含稅講清楚
・每則回覆控制在 150 字以內；LINE 上沒有人想讀長篇
・需要列點時最多三點
・不確定的事就說不確定，然後請對方留下聯絡方式由專人回覆

【絕對不要】
・不要發明這份資料裡沒有的價格、交期、功能或優惠
・不要給折扣、不要議價、不要承諾客製範圍 —— 這些要由專人確認
・不要談論其他客戶的專案細節
・不要提到你使用哪家廠商的模型或技術細節

【什麼時候交給專人】
遇到下列情況，照實說會請專人聯繫，並請對方留下稱呼與聯絡方式：
・客製需求超出標準方案，需要重新報價
・議價、折扣、分期等商務條件
・既有客戶的帳務、合約或客訴
・連續兩次都無法回答對方的問題
`.trim();

/** 整包知識庫。走 prompt caching，所以同一天內的對話都吃得到快取。 */
export function buildKnowledge(): string {
  return [
    CONDUCT,
    HANDBOOK,
    `【方案與價格】（未稅 TWD，結帳加 5% 營業稅）\n\n${productLines()}`,
    `【單項功能參考價】客製範圍會影響價格，最終以諮詢確認報價為準。\n${addonLines()}`,
    `【促銷檔期】\n${promoLines()}`,
  ].join("\n\n────────────────────\n\n");
}
