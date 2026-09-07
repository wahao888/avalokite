// 購物車與計價。純函式，前台 UI 與 /api/amber/order 共用同一份。
//
// ⚠ 兩條不可動搖的規則（沿用 REKAT 已驗證過的做法）：
//   ① localStorage 只存 { productId, optionId, qty }，**不存價格也不存品名**。
//      價格永遠由本檔依伺服器讀出來的快照重算。
//   ② 客戶端送來的任何金額欄位一律忽略。下單路由重讀資料庫、重算一次，
//      螢幕上的數字與入庫的數字因此不可能分岔。
//
// 與 REKAT 的差別：那邊的目錄是 _data/beans.ts，查表與算術可以寫在同一個
// 純函式裡。這邊的目錄在資料庫，所以拆成兩段：
//     loadPricing(tenantId, keys) → LineSnapshot[]   不純，住在 daigou-data.ts
//     priceLines(cart, snaps, now) → Totals          純函式，就是本檔
// 只有查表那一段搬了家，「金錢的唯一真實來源」這個性質完整保留。

import { orderState, type DeadlineBatch, type DeadlineProduct } from "@/lib/daigou-deadline";

export type CartLine = {
  productId: string;
  /** null＝這件商品沒有規格 */
  optionId: string | null;
  qty: number;
};

/** 由資料庫讀出來的一行快照（daigou-data.ts 負責產生） */
export type LineSnapshot = {
  productId: string;
  optionId: string | null;
  /** 這件商品屬於哪一檔連線。下單時用來確認整車沒有跨檔期
   *  （一張結單綁一個檔期，運費與預計到貨日都是檔期的）。 */
  batchId: string;
  name: string;
  optionLabel: string | null;
  unitPrice: number;
  imageKey: string | null;
  /** null＝不限量 */
  stock: number | null;
  preorder: boolean;
  product: DeadlineProduct;
  batch: DeadlineBatch;
};

/** 一行的可下單狀態。gone 之外都要顯示給客人看，不可靜默移除 */
export type LineStatus = "open" | "expired" | "closed" | "unavailable" | "oos" | "gone";

export const LINE_STATUS_ZH: Record<LineStatus, string> = {
  open: "",
  expired: "已截止",
  closed: "本檔已收單",
  unavailable: "已下架",
  oos: "庫存不足",
  gone: "商品已移除",
};

export type PricedLine = {
  productId: string;
  optionId: string | null;
  name: string;
  optionLabel: string | null;
  unitPrice: number;
  qty: number;
  /** qty × unitPrice */
  amount: number;
  imageKey: string | null;
  status: LineStatus;
  /** 顯示庫存的商品才有值 */
  stockLeft: number | null;
};

export type Totals = {
  /** 可以下單的行 */
  lines: PricedLine[];
  /** 不能下單的行——要顯示出來，客人有權知道自己放進去的東西怎麼了 */
  blocked: PricedLine[];
  /** 品項小計（只算 lines，不含運費——運費在結單層級收一次） */
  itemsTotal: number;
  /** 可下單的件數 */
  count: number;
};

export const MAX_QTY_PER_LINE = 99;
export const MAX_LINES = 60;

export const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

const keyOf = (l: { productId: string; optionId: string | null }) =>
  `${l.productId}::${l.optionId ?? ""}`;

/**
 * 把 localStorage 讀回來的東西整理成可信的購物車。
 *
 * 這裡的輸入是使用者可改的（開 devtools 就能編），所以形狀不對的一律丟掉，
 * 而不是拋例外——一個過期的購物車不該讓結帳頁 500。
 * 注意這一層只做「形狀」的正規化，不碰業務規則：某件商品是否已截止要查資料庫，
 * 那是 priceLines 的事。
 */
export function normalizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];

  const merged = new Map<string, CartLine>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;

    const productId = typeof o.productId === "string" ? o.productId.trim() : "";
    if (!productId || productId.length > 40) continue;

    const optionId =
      typeof o.optionId === "string" && o.optionId.trim() ? o.optionId.trim() : null;
    if (optionId && optionId.length > 40) continue;

    const n = Number(o.qty);
    if (!Number.isFinite(n)) continue;
    const qty = Math.floor(n);
    if (qty < 1) continue;

    const k = keyOf({ productId, optionId });
    const prev = merged.get(k);
    const total = Math.min((prev?.qty ?? 0) + qty, MAX_QTY_PER_LINE);
    if (prev) prev.qty = total;
    else merged.set(k, { productId, optionId, qty: total });
  }

  return [...merged.values()].slice(0, MAX_LINES);
}

/**
 * 定價。
 *
 * 沒有對應快照的行 → gone。那件商品已經被移除，客人本來就沒有正當期待。
 * 已截止／庫存不足的行 → 進 blocked 但絕不靜默消失：她把它放進購物車時
 * 是開放的，默默移除等於在她不知情的狀況下改掉她即將要付的金額。
 */
export function priceLines(cart: CartLine[], snaps: LineSnapshot[], now: Date): Totals {
  const byKey = new Map(snaps.map((s) => [keyOf(s), s]));

  const lines: PricedLine[] = [];
  const blocked: PricedLine[] = [];

  for (const line of cart) {
    const snap = byKey.get(keyOf(line));

    if (!snap) {
      blocked.push({
        productId: line.productId,
        optionId: line.optionId,
        name: "已移除的商品",
        optionLabel: null,
        unitPrice: 0,
        qty: line.qty,
        amount: 0,
        imageKey: null,
        status: "gone",
        stockLeft: null,
      });
      continue;
    }

    const priced: PricedLine = {
      productId: snap.productId,
      optionId: snap.optionId,
      name: snap.name,
      optionLabel: snap.optionLabel,
      unitPrice: snap.unitPrice,
      qty: line.qty,
      amount: snap.unitPrice * line.qty,
      imageKey: snap.imageKey,
      status: "open",
      stockLeft: snap.stock,
    };

    const state = orderState(snap.product, snap.batch, now);
    if (!state.open) {
      priced.status =
        state.reason === "expired"
          ? "expired"
          : state.reason === "batch-closed"
            ? "closed"
            : "unavailable";
      blocked.push(priced);
      continue;
    }

    // 預購商品刻意跳過庫存檢查——那正是「允許預購」的意思。
    if (!snap.preorder && snap.stock !== null && snap.stock < line.qty) {
      priced.status = "oos";
      blocked.push(priced);
      continue;
    }

    lines.push(priced);
  }

  return {
    lines,
    blocked,
    itemsTotal: lines.reduce((s, l) => s + l.amount, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

/**
 * 商品卡上的價格顯示。規格各自有價時顯示「NT$250 起」（同 lemai 的做法）。
 * 全部同價就不加「起」——加了會讓客人以為還有更貴的。
 */
export function priceFrom(
  basePrice: number,
  optionPrices: (number | null)[],
): { min: number; ranged: boolean } {
  if (optionPrices.length === 0) return { min: basePrice, ranged: false };
  const prices = optionPrices.map((p) => p ?? basePrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, ranged: min !== max };
}

/** 價格顯示字串：「NT$250」或「NT$250 起」 */
export const priceLabel = (basePrice: number, optionPrices: (number | null)[]): string => {
  const { min, ranged } = priceFrom(basePrice, optionPrices);
  return ranged ? `${twd(min)} 起` : twd(min);
};
