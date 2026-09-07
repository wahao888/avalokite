// 一鍵複製的通知文字。純函式。
//
// 第一期不接 LINE Messaging API（免費方案每月只有 200 則推播，超過要升方案），
// 所以這些文字就是**唯一的對外通道**：後台產生、Amber 複製、貼進 LINE。
// 因此它們必須直接可貼、內容完整，不能是需要她再補字的半成品。
//
// ⚠ 金額一律由呼叫端傳入 SettleTotals，本檔不自己算。
// 兩邊各算一次的話，某天有人只改了其中一邊，客人收到的金額就會跟畫面不同——
// 而客人相信的是收到的那一則。

import { twd } from "./cart";
import { formatTaipei } from "@/lib/tw-time";
import { countdownLabel } from "@/lib/daigou-deadline";
import { LINE_STATUS_ZH, type SettleTotals } from "./settle";

export type BankInfo = {
  bankName: string;
  bankCode: string;
  account: string;
  holder: string;
};

export type LinePayInfo = { lineId: string; payLink: string };

/**
 * 組行。
 *
 * ⚠ 只濾掉 null / undefined / false，**空字串要留著**——那是刻意插入的
 * 段落分隔。用 Boolean(l) 過濾會把它們一起吃掉，文字貼到 LINE 就變成
 * 一整片沒有斷行的牆，客人根本看不出金額在哪裡。（2026-09-07 實測發現。）
 */
const nl = (lines: (string | null | undefined | false)[]): string =>
  lines.filter((l): l is string => l !== null && l !== undefined && l !== false).join("\n");

/** 收款資訊區塊。未填時退成「我們會與您聯絡」，不留空欄位 */
function paymentBlock(bank: BankInfo, linepay: LinePayInfo): string {
  const hasBank = Boolean(bank.bankName && bank.account);
  const hasLinePay = Boolean(linepay.lineId || linepay.payLink);
  if (!hasBank && !hasLinePay) return "付款方式我會另外私訊給您 🙏";

  return nl([
    "💳 付款方式",
    hasBank &&
      nl([
        `・銀行匯款：${bank.bankName}${bank.bankCode ? `（${bank.bankCode}）` : ""}`,
        `  帳號 ${bank.account}`,
        bank.holder ? `  戶名 ${bank.holder}` : null,
      ]),
    hasLinePay &&
      nl([
        "・LINE Pay",
        linepay.payLink ? `  ${linepay.payLink}` : null,
        !linepay.payLink && linepay.lineId ? `  請私訊 ${linepay.lineId}` : null,
      ]),
  ]);
}

// ── 群組公告 ─────────────────────────────────────────────────

export function batchOpenText(input: {
  batchTitle: string;
  deadline: Date | null;
  url: string;
}): string {
  return nl([
    `🛍️ ${input.batchTitle} 開跑囉！`,
    input.deadline ? `⏰ 收單時間：${formatTaipei(input.deadline)}` : null,
    "",
    "👉 直接點連結選購，選好加入購物車就可以了：",
    input.url,
    "",
    "連線期間隨時都能再加購，不用重填資料 😊",
  ]);
}

export function deadlineReminderText(input: {
  batchTitle: string;
  deadline: Date;
  now: Date;
  url: string;
}): string {
  return nl([
    `⏰ ${input.batchTitle} ${countdownLabel(input.deadline, input.now)}！`,
    `收單時間：${formatTaipei(input.deadline)}`,
    "",
    "還沒下單的把握時間 👇",
    input.url,
  ]);
}

export function shortageSummaryText(input: {
  batchTitle: string;
  items: { name: string; optionLabel: string | null }[];
}): string {
  if (input.items.length === 0) {
    return `🎉 ${input.batchTitle} 全部都買到了，沒有缺貨！`;
  }
  return nl([
    `📢 ${input.batchTitle} 缺貨回報`,
    "",
    "這次現場沒有補到的品項：",
    ...input.items.map(
      (i) => `・${i.name}${i.optionLabel ? `（${i.optionLabel}）` : ""}`,
    ),
    "",
    "有影響到的朋友我會另外私訊說明金額，缺貨的部分不會收費 🙏",
  ]);
}

// ── 逐客人私訊（最重要的三則）──────────────────────────────

export type SettlementItemLine = {
  name: string;
  optionLabel: string | null;
  qty: number;
  effectiveQty: number;
  status: string;
};

/**
 * 個別結單請款。
 *
 * 這是全系統最重要的一則文字：客人是靠它知道自己要付多少錢的。
 * 必含三件事——金額的完整拆解、付款方式、專屬查詢連結。
 */
export function settlementRequestText(input: {
  memberName: string;
  batchTitle: string;
  totals: SettleTotals;
  items: SettlementItemLine[];
  url: string;
  bank: BankInfo;
  linepay: LinePayInfo;
  etaAt?: Date | null;
}): string {
  const t = input.totals;
  const shorted = input.items.filter((i) => i.effectiveQty < i.qty);

  return nl([
    `${input.memberName} 您好 😊`,
    `${input.batchTitle} 已經結單囉，這是您的明細：`,
    "",
    ...input.items
      .filter((i) => i.effectiveQty > 0)
      .map(
        (i) =>
          `・${i.name}${i.optionLabel ? `（${i.optionLabel}）` : ""} ×${i.effectiveQty}`,
      ),
    shorted.length > 0 ? "" : null,
    shorted.length > 0 ? "以下品項未能買到，已從金額扣除：" : null,
    ...shorted.map(
      (i) =>
        `・${i.name}${i.optionLabel ? `（${i.optionLabel}）` : ""} ${
          LINE_STATUS_ZH[i.status as keyof typeof LINE_STATUS_ZH] ?? "缺貨"
        }${i.effectiveQty > 0 ? `（訂 ${i.qty} 只買到 ${i.effectiveQty}）` : ""}`,
    ),
    "",
    "──────────",
    `商品金額　${twd(t.grossAmount)}`,
    t.deductAmount > 0 ? `缺貨扣除　−${twd(t.deductAmount)}` : null,
    t.adjustAmount !== 0
      ? `金額調整　${t.adjustAmount > 0 ? "+" : "−"}${twd(Math.abs(t.adjustAmount))}`
      : null,
    t.shippingFee > 0 ? `運　　費　${twd(t.shippingFee)}` : null,
    t.creditApplied > 0 ? `折　　抵　−${twd(t.creditApplied)}` : null,
    `應付金額　${twd(t.payableAmount)}`,
    t.paidAmount > 0 ? `已收金額　${twd(t.paidAmount)}` : null,
    t.paidAmount > 0 && t.balance > 0 ? `尚需補款　${twd(t.balance)}` : null,
    "──────────",
    "",
    paymentBlock(input.bank, input.linepay),
    "",
    "匯款後請到這裡回報末五碼，我才好對帳 🙏",
    input.url,
    input.etaAt ? "" : null,
    input.etaAt ? `📦 預計到貨：${formatTaipei(input.etaAt, { withTime: false })}` : null,
  ]);
}

export function shortageNoticeText(input: {
  memberName: string;
  batchTitle: string;
  items: SettlementItemLine[];
  totals: SettleTotals;
  url: string;
}): string {
  return nl([
    `${input.memberName} 您好 🙏`,
    `很抱歉，${input.batchTitle} 有品項沒有買到：`,
    "",
    ...input.items.map(
      (i) =>
        `・${i.name}${i.optionLabel ? `（${i.optionLabel}）` : ""}${
          i.effectiveQty > 0 ? ` 訂 ${i.qty} 只買到 ${i.effectiveQty}` : " 缺貨"
        }`,
    ),
    "",
    `缺貨的部分不會收費，您的金額已調整為 ${twd(input.totals.payableAmount)}。`,
    "",
    "完整明細可以在這裡看：",
    input.url,
  ]);
}

export function shippedNoticeText(input: {
  memberName: string;
  batchTitle: string;
  shipNo: string | null;
  shipMethod: string;
  etaAt: Date | null;
  url: string;
}): string {
  return nl([
    `${input.memberName} 您好 📦`,
    `${input.batchTitle} 的包裹已經寄出囉！`,
    "",
    `寄送方式：${input.shipMethod}`,
    input.shipNo ? `貨態編號：${input.shipNo}` : null,
    input.etaAt
      ? `預計到貨：${formatTaipei(input.etaAt, { withTime: false })}`
      : null,
    "",
    "訂單明細：",
    input.url,
    "",
    "收到後有任何問題都可以跟我說 😊",
  ]);
}
