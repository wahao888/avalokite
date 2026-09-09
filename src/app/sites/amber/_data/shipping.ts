// 運費。純函式。
//
// 客戶 2026-09-09 提供的實際規則：
//
//     7-11 取貨（先付款）    $60     滿 3,500 免運
//     全家取貨（先付款）      $60     滿 3,500 免運
//     宅配（先付款）         $120    滿 5,000 免運
//
// ⚠ 這取代了原本「7-11 交貨便依申報價值分級（60–100，每滿千加十）」的算法。
// 那是我從 7-11 的公開費率推出來的**成本**，不是她對客人的**報價**——
// 她收的是固定價，級距差額自己吸收。照公開費率算的話，一單 4,300 會跟客人
// 收 100，但她其實只收 60，等於憑空多收 40。
//
// 「先付款」是相對於貨到付款，講的是付款時點（她採預購制），不是另一種費率。

/** 取貨方式 → 運費與免運門檻。key 對照 site.ts 的 SHIP_KINDS */
export const SHIPPING: Record<string, { fee: number; freeOver: number }> = {
  cvs: { fee: 60, freeOver: 3500 },
  home: { fee: 120, freeOver: 5000 },
};

/** 認不得的取貨方式一律當超商——那是她的主要管道，而且是比較便宜的那個。
 *  猜錯時寧可少收（她自己吸收）也不要多收客人錢。 */
const rule = (shipKind: string | null | undefined) =>
  (shipKind && SHIPPING[shipKind]) || SHIPPING.cvs;

/**
 * 這張結單最終要收的運費。
 *
 * @param goodsNet 商品淨額（缺貨／取消扣掉之後）——那才是真正裝進箱子的東西。
 *                 用原始金額判斷免運會白送一趟運費，這是 REKAT 的免運門檻踩過的坑。
 */
export function settlementShipping(input: {
  shipKind: string | null | undefined;
  goodsNet: number;
  /** 這一檔覆寫的運費（>0 才算）。整批都是重物時用，例如鑄鐵鍋 */
  batchFee?: number | null;
  /** 這一檔覆寫的免運門檻。null = 用預設表 */
  batchFreeOver?: number | null;
}): number {
  // ⚠ 淨額 0 = 全部缺貨 = 根本沒有包裹要寄，運費當然是 0。
  // 少了這一行，一位所有商品都沒買到的客人還是會被收運費——
  // 而她已經先付過款了，那筆錢就是實實在在多收的。
  if (input.goodsNet <= 0) return 0;

  const base = rule(input.shipKind);
  const freeOver = input.batchFreeOver ?? base.freeOver;
  if (freeOver > 0 && input.goodsNet >= freeOver) return 0;

  return input.batchFee && input.batchFee > 0 ? input.batchFee : base.fee;
}

/** 還差多少免運。已達門檻或沒有門檻時回 0——前台用來推「再買 X 元就免運」 */
export function amountToFreeShipping(input: {
  shipKind: string | null | undefined;
  goodsNet: number;
  batchFreeOver?: number | null;
}): number {
  const freeOver = input.batchFreeOver ?? rule(input.shipKind).freeOver;
  if (freeOver <= 0) return 0;
  return Math.max(0, freeOver - Math.max(0, input.goodsNet));
}
