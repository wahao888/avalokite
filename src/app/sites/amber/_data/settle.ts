// 結單與對帳。純函式，後台結單頁、客人的 /s/<token> 與通知文字共用同一份。
//
// ⚠ 這個檔是整個系統的金錢核心，只有一條規則但絕不能破：
//
//   下單當下寫進 DgLine 的 unitPrice / qty / amount **永遠不動**。
//   「缺貨要扣多少」一律由 status 與 gotQty 推導。
//
// REKAT 的教訓是「把折扣攤回單價，事後就查不出那筆差額是怎麼來的」。
// 這裡的版本更嚴重：客人已經看過一次金額了，若就地改掉原始數字，
// 她問「為什麼跟你上次說的不一樣」時，沒有人答得出來。
//
// 對帳鏈（Amber 與客人隨時都要看得到這幾段）：
//     grossAmount   原始金額
//   − deductAmount  缺貨／取消／少買扣除
//   + adjustAmount  手動調整（匯差、湊整…，可正可負，必帶 adjustNote）
//   + shippingFee   運費（一張結單只收一次，不隨訂單筆數增加）
//   − creditApplied 折抵（上一檔缺貨留下的餘額）
//   = payableAmount 應收
//   − paidAmount    實收   →  差額為正＝應補，為負＝應退

import { settlementShipping } from "./shipping";

export const LINE_STATUSES = [
  "ordered",
  "bought",
  "oos",
  "cancelled",
  "refunded",
] as const;

export type LineItemStatus = (typeof LINE_STATUSES)[number];

export const LINE_STATUS_ZH: Record<LineItemStatus, string> = {
  ordered: "待採購",
  bought: "已買到",
  oos: "缺貨",
  // ⚠ 客戶的規範是「下單後恕不接受取消訂單」，所以這不是客人的權利——
  // 是她自己決定不採購、或破例同意時才用。缺貨走 oos，退款走 refunded。
  cancelled: "取消",
  refunded: "已退款",
};

export const isLineStatus = (v: unknown): v is LineItemStatus =>
  typeof v === "string" && (LINE_STATUSES as readonly string[]).includes(v);

export const SETTLEMENT_STATUSES = [
  "open",
  "awaiting",
  "paid",
  "shipped",
  "done",
  "cancelled",
] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const SETTLEMENT_STATUS_ZH: Record<SettlementStatus, string> = {
  open: "收單中",
  awaiting: "待付款",
  paid: "已付款",
  shipped: "已出貨",
  done: "已完成",
  cancelled: "已取消",
};

export const isSettlementStatus = (v: unknown): v is SettlementStatus =>
  typeof v === "string" && (SETTLEMENT_STATUSES as readonly string[]).includes(v);

/** 金額凍結之後，結單就不該再被自動重算 */
export const isFrozen = (status: SettlementStatus): boolean => status !== "open";

export type LineForSettle = {
  /** 下單當下的快照，不可變 */
  unitPrice: number;
  qty: number;
  amount: number;
  /** 實際買到的數量。null＝視同 qty */
  gotQty: number | null;
  status: LineItemStatus;
};

export type SettledLine = {
  /** 這一行實際成立的數量 */
  effectiveQty: number;
  /** 實際成立的金額 */
  effectiveAmount: number;
  /** 從原始金額扣掉多少 */
  deduct: number;
};

/**
 * 一行實際成立幾件。
 *
 * ordered（還沒去採購）先當作會全部買到——結單前的畫面要顯示「預估金額」，
 * 一律當成 0 會讓 Amber 在採購前看到一張總額 0 的結單，那沒有意義。
 */
export function effectiveQty(line: LineForSettle): number {
  switch (line.status) {
    case "cancelled":
    case "refunded":
      return 0;
    case "oos":
      // 分配的結果可能是「部分買到」：需要 5、只分到 2，剩下 3 缺貨。
      return clampQty(line.gotQty ?? 0, line.qty);
    case "bought":
      return clampQty(line.gotQty ?? line.qty, line.qty);
    case "ordered":
    default:
      return line.qty;
  }
}

const clampQty = (n: number, max: number): number =>
  Math.max(0, Math.min(Math.floor(Number.isFinite(n) ? n : 0), max));

export function settleLine(line: LineForSettle): SettledLine {
  const q = effectiveQty(line);
  const effectiveAmount = q * line.unitPrice;
  return {
    effectiveQty: q,
    effectiveAmount,
    // 用 amount（凍結的原始金額）當被減數，而不是 qty × unitPrice 重算：
    // 兩者理應相等，但若哪天有人手動修過一筆資料，扣除額要對得起
    // 客人看過的那個數字，而不是我們重算出來的。
    deduct: Math.max(0, line.amount - effectiveAmount),
  };
}

export type SettleInput = {
  lines: LineForSettle[];
  shippingFee?: number;
  /** 手動調整，可正可負 */
  adjustAmount?: number;
  /** 折抵（上一檔缺貨留下的餘額） */
  creditApplied?: number;
  /** 已收（DgLedger 的收款流水加總） */
  paidAmount?: number;
};

export type SettleTotals = {
  grossAmount: number;
  deductAmount: number;
  adjustAmount: number;
  shippingFee: number;
  creditApplied: number;
  payableAmount: number;
  paidAmount: number;
  /** 應收 − 實收。正＝客人還要補，負＝要退給客人 */
  balance: number;
  /** 實際成立的件數 */
  itemCount: number;
};

export function settleTotals(input: SettleInput): SettleTotals {
  const shippingFee = input.shippingFee ?? 0;
  const adjustAmount = input.adjustAmount ?? 0;
  const creditApplied = input.creditApplied ?? 0;
  const paidAmount = input.paidAmount ?? 0;

  let grossAmount = 0;
  let deductAmount = 0;
  let itemCount = 0;

  for (const line of input.lines) {
    const s = settleLine(line);
    grossAmount += line.amount;
    deductAmount += s.deduct;
    itemCount += s.effectiveQty;
  }

  // 應收不會是負數：折抵超過應付時餘額留在帳上，不倒找錢。
  const payableAmount = Math.max(
    0,
    grossAmount - deductAmount + adjustAmount + shippingFee - creditApplied,
  );

  return {
    grossAmount,
    deductAmount,
    adjustAmount,
    shippingFee,
    creditApplied,
    payableAmount,
    paidAmount,
    balance: payableAmount - paidAmount,
    itemCount,
  };
}

/**
 * 這張結單實際可以折抵多少（不超過應付金額）。
 * 折抵超出的部分留在會員帳上給下一檔用，不退現金。
 */
export function creditToApply(available: number, payableBeforeCredit: number): number {
  return Math.max(0, Math.min(available, payableBeforeCredit));
}

export type LedgerEntry = {
  kind: "payment" | "refund" | "credit" | "credit_use";
  amount: number;
};

/**
 * 會員手上還剩多少折抵額度。
 *
 * credit 是「缺貨的錢先記在帳上」，credit_use 是「這一檔用掉了多少」。
 * 兩者相減就是餘額。做成流水而不是一個 balance 欄位，是為了任何時候都
 * 回答得出「這 200 元是哪一檔缺貨來的、又用在哪一檔」。
 */
export function memberCredit(entries: LedgerEntry[]): number {
  let credit = 0;
  for (const e of entries) {
    if (e.kind === "credit") credit += e.amount;
    else if (e.kind === "credit_use") credit -= e.amount;
  }
  return Math.max(0, credit);
}

/** 已收金額＝收款 − 退款。退款走現金退回時才算，折抵不算在這裡 */
export function paidFromLedger(entries: LedgerEntry[]): number {
  let paid = 0;
  for (const e of entries) {
    if (e.kind === "payment") paid += e.amount;
    else if (e.kind === "refund") paid -= e.amount;
  }
  return paid;
}

// ═══════════════════════════════════════════════════════════════
// 結單的即時金額（含自動運費）
// ═══════════════════════════════════════════════════════════════

export type BatchShipping = {
  /** 這一檔覆寫的運費（0 = 用預設表）。整批都是重物時才設 */
  shippingFee: number;
  /** 這一檔覆寫的免運門檻（null = 用預設表） */
  freeShippingOver: number | null;
};

/**
 * 一張結單「照現在的行狀態」該收多少。
 *
 * 運費在這裡才算，因為免運門檻看的是**商品淨額**（缺貨扣掉之後）——
 * 那才是真正裝進箱子的東西。用原始金額判斷會白送一趟運費。
 */
export function liveSettlement(input: {
  lines: LineForSettle[];
  batch: BatchShipping;
  adjustAmount?: number;
  creditApplied?: number;
  paidAmount?: number;
  /** 她在這張結單上手動改過的運費。給了就以它為準 */
  shippingOverride?: number | null;
  /**
   * 取貨方式。運費與免運門檻都看它：超商 $60／滿 3,500 免運，
   * 宅配 $120／滿 5,000 免運。
   * ⚠ 來自訂單快照（DgOrder.shipKind），不是檔期的屬性。
   */
  shipKind?: string | null;
}): SettleTotals {
  // 先算一次不含運費的，拿到商品淨額
  const base = settleTotals({ lines: input.lines });
  const goodsNet = base.grossAmount - base.deductAmount;

  const shippingFee =
    input.shippingOverride != null
      ? input.shippingOverride
      : settlementShipping({
          shipKind: input.shipKind,
          goodsNet,
          batchFee: input.batch.shippingFee,
          batchFreeOver: input.batch.freeShippingOver,
        });

  return settleTotals({
    lines: input.lines,
    shippingFee,
    adjustAmount: input.adjustAmount,
    creditApplied: input.creditApplied,
    paidAmount: input.paidAmount,
  });
}

/**
 * 結單凍結之後，因為缺貨而應該退給客人的金額。
 *
 * ⚠ 這是「先收款」流程的關鍵。客戶的流程是
 * 「確認下單 → 匯款 → 採買」——她**先拿到錢，之後才知道缺不缺貨**。
 * 凍結的金額不會自動變（那是刻意的：客人手上那個數字要對得起來），
 * 所以差額必須被算出來、明白地擺在她眼前，而不是等她自己想到要退。
 *
 * 回傳正數 = 應退給客人；0 = 不用退。
 */
export function refundDueAfterFreeze(input: {
  /** 結單當下凍結、也是通知給客人的應付金額 */
  frozenPayable: number;
  /** 依現在的行狀態重算的應付金額 */
  currentPayable: number;
}): number {
  return Math.max(0, input.frozenPayable - input.currentPayable);
}

/**
 * 一張結單該顯示的金額。所有頁面都走這一支，才不會有的算含運費、有的不含。
 *
 * 未結單（open）→ 依現在的行狀態即時算，運費依取貨方式與商品淨額自動判斷。
 * 已結單 → 用凍結進資料庫的那一份：那是**通知給客人的數字**，
 *          不能因為之後標了缺貨就自己變小，否則客人手上那張對不起來。
 *          缺貨造成的差額由 refundDueAfterFreeze 另外算，明白地擺出來。
 */
/**
 * 這張結單的取貨方式：以**最後一筆訂單**為準（客人可能中途改過）。
 *
 * ⚠ 這個規則必須跟 /s 頁顯示收件資料的規則一致（那裡也是 orders.at(-1)）——
 * 畫面上寫「7-11 取貨」卻按宅配收 $120，是客人一定會抓到的錯。
 */
export const settlementShipKind = (
  orders: { shipKind: string }[],
): string | null => orders.at(-1)?.shipKind ?? null;

export function settlementTotalsFor(s: {
  status: string;
  shippingFee: number;
  adjustAmount: number;
  creditApplied: number;
  paidAmount: number;
  grossAmount: number;
  deductAmount: number;
  payableAmount: number;
  batch: BatchShipping;
  lines: LineForSettle[];
  /** 取貨方式（來自訂單快照）。決定運費與免運門檻 */
  shipKind?: string | null;
}): SettleTotals {
  if (!isFrozen(s.status as SettlementStatus)) {
    return liveSettlement({
      lines: s.lines,
      batch: s.batch,
      shipKind: s.shipKind,
      adjustAmount: s.adjustAmount,
      creditApplied: s.creditApplied,
      paidAmount: s.paidAmount,
    });
  }
  return {
    grossAmount: s.grossAmount,
    deductAmount: s.deductAmount,
    adjustAmount: s.adjustAmount,
    shippingFee: s.shippingFee,
    creditApplied: s.creditApplied,
    payableAmount: s.payableAmount,
    paidAmount: s.paidAmount,
    balance: s.payableAmount - s.paidAmount,
    itemCount: s.lines.reduce((n, l) => n + effectiveQty(l), 0),
  };
}
