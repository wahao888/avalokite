// REKAT ROASTERY — 商店設定與購物車計價
//
// ⚠️⚠️ 本檔的運費、貨到付款手續費、匯款帳號、LINE Pay 收款方式全部是
//      「待客戶確認」的預設值。上線前務必逐項跟王龍核對。
//      標了 TODO 的常數不要當成事實引用。
//
// 計價全部是純函式，src/app/api/rekat/order 與 tests/rekat-shop.test.ts 共用同一份，
// 前台顯示的金額與後端寫入資料庫的金額因此不可能算出不同答案。

import { getBean, type Bean } from "./beans";

// ── 出貨規格 ──────────────────────────────────────────────────
// 本店只出原豆，不提供代磨（客戶確認）。所以購物車的一行就是「一支豆子」，
// 沒有研磨度這個維度——留一個永遠等於「原豆」的欄位只會讓每一層都要處理它。

export const WHOLE_BEAN_ONLY = "一律出原豆，不代客研磨";

// ── 付款方式 ──────────────────────────────────────────────────
// 三種都是線下收款：本站不串任何金流 API，也不經手信用卡或金融帳號資料。

export type PaymentKey = "transfer" | "linepay" | "cod";

export const PAYMENT: { key: PaymentKey; label: string; desc: string }[] = [
  {
    key: "transfer",
    label: "銀行匯款 / ATM 轉帳",
    desc: "下單後顯示匯款帳號，轉帳完成再回填末五碼，我們核對後出貨。",
  },
  {
    key: "linepay",
    label: "LINE Pay",
    desc: "訂單確認後，我們會傳 LINE Pay 收款連結給你；付款完成後回填交易末五碼即可。",
  },
  {
    key: "cod",
    label: "貨到付款",
    desc: "宅配到府時直接付現給宅配人員，另加收手續費。",
  },
];

export const PAYMENT_LABEL: Record<PaymentKey, string> = {
  transfer: "銀行匯款 / ATM 轉帳",
  linepay: "LINE Pay",
  cod: "貨到付款",
};

export const isPayment = (v: unknown): v is PaymentKey =>
  v === "transfer" || v === "cod" || v === "linepay";

/** 需要客人自行回報付款的方式（貨到付款不用——錢是當面給宅配的） */
export const needsPaymentReport = (p: PaymentKey): boolean => p !== "cod";

// ── 運費 ──────────────────────────────────────────────────────
// TODO(客戶確認)：以下三個數字是依台灣常溫宅配行情設的預設值，非客戶提供。
export const SHIPPING_FEE = 160;
export const FREE_SHIPPING_OVER = 2000;
export const COD_FEE = 30;

/** TODO(客戶確認)：匯款帳號。全部留空時，訂單完成頁會改成「我們會與您聯絡提供帳號」。 */
export const BANK = {
  bankName: null as string | null,
  bankCode: null as string | null,
  account: null as string | null,
  accountName: null as string | null,
};

export const bankReady = () => Boolean(BANK.bankName && BANK.account);

/**
 * TODO(客戶確認)：LINE Pay 的收款方式。
 * 填了 lineId 或 payLink，訂單完成頁就會直接顯示；否則顯示「我們會與你聯絡」。
 * 注意：這裡放的是「請客人來付款」的公開資訊，不是任何金流 API 憑證。
 */
export const LINEPAY = {
  lineId: null as string | null,
  payLink: null as string | null,
};

export const linePayReady = () => Boolean(LINEPAY.lineId || LINEPAY.payLink);

// ── 購物車 ────────────────────────────────────────────────────

export type CartLine = { slug: string; qty: number };

/** 一行結算後的樣子。unitPrice 一律以下單當下的售價入庫。 */
export type PricedLine = {
  slug: string;
  name: string;
  unitPrice: number;
  qty: number;
  /** qty × unitPrice。三包優惠不在這裡扣，見 Totals.bundles */
  amount: number;
  /** 這一行還差幾包才湊滿下一組優惠。0 = 沒優惠或剛好湊滿 */
  toNextBundle: number;
};

/** 湊成一組三包優惠的紀錄。前台把它列成獨立的折抵列。 */
export type BundleSaving = {
  slug: string;
  name: string;
  /** 豆單原文的「三包」或「特三包」 */
  label: string;
  /** 幾包一組 */
  per: number;
  /** 湊成了幾組 */
  sets: number;
  unitPrice: number;
  bundlePrice: number;
  /** 這幾組總共折抵多少（正數） */
  saved: number;
};

export type Totals = {
  lines: PricedLine[];
  bundles: BundleSaving[];
  /** 未折扣前的定價總額 */
  listTotal: number;
  /** 三包優惠折抵合計（正數） */
  discount: number;
  subtotal: number;
  shippingFee: number;
  codFee: number;
  total: number;
  /** 總支數 */
  count: number;
};

export const MAX_QTY_PER_LINE = 20;
export const MAX_LINES = 20;

/**
 * 三包優惠。
 *
 * **折抵獨立成一列，不改行金額**。每一行仍然是「數量 × 單價」的直接乘法，
 * 折抵另外列一條「三包4800 ×1　−NT$1,200」。這樣客人拿網頁跟紙本豆單對，
 * 每個數字都對得起來；把優惠攤回各行單價反而會出現對不上的小數。
 *
 * 湊不滿一組的餘數以原價計，例如 7 包＝2 組優惠價 ＋ 1 包原價。
 */
export function bundleSetsFor(bean: Bean, qty: number): number {
  if (!bean.bundle || bean.bundle.qty <= 0) return 0;
  return Math.floor(qty / bean.bundle.qty);
}

/** 一支豆子一行，重複出現就合併數量。 */
export function normalizeCart(lines: CartLine[]): CartLine[] {
  const m = new Map<string, CartLine>();
  for (const l of lines) {
    if (!getBean(l.slug)) continue;
    const qty = Math.floor(Number(l.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const cur = m.get(l.slug);
    if (cur) cur.qty = Math.min(MAX_QTY_PER_LINE, cur.qty + qty);
    else m.set(l.slug, { slug: l.slug, qty: Math.min(MAX_QTY_PER_LINE, qty) });
  }
  return [...m.values()].slice(0, MAX_LINES);
}

/**
 * 購物車結算。前台與 API 共用——金額只有這一個真實來源。
 * 未知的 slug 會被安靜丟掉（豆單下架後，客人瀏覽器裡的舊購物車不該讓結帳整個爆掉）。
 */
export function priceCart(rawLines: CartLine[], payment: PaymentKey): Totals {
  const lines: PricedLine[] = [];
  const bundles: BundleSaving[] = [];
  let listTotal = 0;
  let discount = 0;
  let count = 0;

  for (const l of normalizeCart(rawLines)) {
    const bean = getBean(l.slug);
    if (!bean) continue;
    const amount = l.qty * bean.price;
    listTotal += amount;
    count += l.qty;

    const sets = bundleSetsFor(bean, l.qty);
    lines.push({
      slug: bean.slug,
      name: bean.nameZh,
      unitPrice: bean.price,
      qty: l.qty,
      amount,
      toNextBundle: bean.bundle ? (bean.bundle.qty - (l.qty % bean.bundle.qty)) % bean.bundle.qty : 0,
    });

    if (bean.bundle && sets > 0) {
      const saved = sets * (bean.bundle.qty * bean.price - bean.bundle.price);
      if (saved > 0) {
        discount += saved;
        bundles.push({
          slug: bean.slug,
          name: bean.nameZh,
          label: bean.bundle.label,
          per: bean.bundle.qty,
          sets,
          unitPrice: bean.price,
          bundlePrice: bean.bundle.price,
          saved,
        });
      }
    }
  }
  // 折抵多的排前面，讓客人一眼看到最有感的那一條
  bundles.sort((a, b) => b.saved - a.saved);

  const subtotal = listTotal - discount;
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  const codFee = subtotal > 0 && payment === "cod" ? COD_FEE : 0;

  return {
    lines,
    bundles,
    listTotal,
    discount,
    subtotal,
    shippingFee,
    codFee,
    total: subtotal + shippingFee + codFee,
    count,
  };
}

export const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;
