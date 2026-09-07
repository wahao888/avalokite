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
  cancelled: "取消", // 客人要求取消
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
