// 7-ELEVEN 交貨便運費。純函式。
//
// ⚠ 運費**不是固定值，依「申報價值」分級**。這是代購最容易賠錢的地方：
// 一件 NT$4,300 的結單，運費是 100 不是 60——固定收 60 的話每一單少收 40。
// 級距是公開規則，算得出來就不該讓她自己記。
//
// 資料來源：7-ELEVEN 交貨便公開費率（2026-09 查得）。
// 客戶的出貨說明寫明「寄送方式：7-11 交貨便／賣貨便」，所以只做這一家。

export const SHIP_PLANS = ["standard", "economy", "fixed"] as const;
export type ShipPlan = (typeof SHIP_PLANS)[number];

export const SHIP_PLAN_ZH: Record<ShipPlan, string> = {
  standard: "一般交貨便（依金額 60–100）",
  economy: "經濟交貨便（依金額 55–95）",
  fixed: "固定金額（自己填）",
};

export const isShipPlan = (v: unknown): v is ShipPlan =>
  typeof v === "string" && (SHIP_PLANS as readonly string[]).includes(v);

/** 每一級距的金額級數：每滿 1,000 元跳一級 */
const TIER_STEP = 1000;

/** 各方案的起價（申報價值 1–1,000 元），以及每跳一級加多少 */
const BASE: Record<Exclude<ShipPlan, "fixed">, number> = {
  standard: 60, // 最長邊 45cm、三邊合計 105cm、10kg 內
  economy: 55, // 限用 23×32cm 專用袋、5kg 內
};
const PER_TIER = 10;

/**
 * 公開費率表只列到申報價值 5,000 元（第 5 級）。
 * 超過的部分我們沿用「每 1,000 元 +10」的規律往上推——寧可算高一點，
 * 少收才是她自己吸收。
 * TODO(客戶確認)：她的實際寄件單價與 5,000 元以上的級距。
 */
const MAX_PUBLISHED_TIER = 5;

/** 這個申報價值落在第幾級（1 起算） */
export function shippingTier(declaredValue: number): number {
  if (!Number.isFinite(declaredValue) || declaredValue <= 0) return 1;
  return Math.max(1, Math.ceil(declaredValue / TIER_STEP));
}

/** 這一級是不是已經超出公開費率表的範圍（UI 要提醒她確認） */
export const isExtrapolatedTier = (declaredValue: number): boolean =>
  shippingTier(declaredValue) > MAX_PUBLISHED_TIER;

/**
 * 依申報價值算運費。
 *
 * @param plan  fixed 表示她自己填，回傳 fallback
 * @param declaredValue 申報價值＝實際裝箱的商品淨額（缺貨扣掉之後的），
 *                      因為那才是箱子裡真正的東西
 */
export function cvsShippingFee(
  plan: ShipPlan,
  declaredValue: number,
  fallback = 0,
): number {
  if (plan === "fixed") return Math.max(0, Math.floor(fallback));
  return BASE[plan] + (shippingTier(declaredValue) - 1) * PER_TIER;
}

/**
 * 這張結單最終要收的運費。
 *
 * 滿額免運看的是**商品淨額**（缺貨扣掉之後）——用原始金額判斷會白送一趟運費，
 * 這是 REKAT 的免運門檻踩過的同一個坑。
 */
export function settlementShipping(input: {
  plan: ShipPlan;
  /** 商品淨額（缺貨／取消扣除之後） */
  goodsNet: number;
  /** fixed 方案時用這個 */
  fixedFee?: number;
  /** 滿額免運門檻。null / 0 = 沒有 */
  freeOver?: number | null;
}): number {
  // ⚠ 淨額 0 = 全部缺貨 = 根本沒有包裹要寄，運費當然是 0。
  // 少了這一行，一位所有商品都沒買到的客人還是會被收 60 元運費——
  // 而她已經先付過款了，那 60 元就是實實在在多收的。
  // （2026-09-07 實測：凍結 310、全缺貨後只算出應退 250。）
  if (input.goodsNet <= 0) return 0;

  if (input.freeOver && input.goodsNet >= input.freeOver) return 0;
  return cvsShippingFee(input.plan, input.goodsNet, input.fixedFee ?? 0);
}
