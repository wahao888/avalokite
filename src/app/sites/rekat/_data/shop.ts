// REKAT ROASTERY — 商店設定與購物車計價
//
// ⚠️ 運費、免運門檻與匯款帳號皆已經客戶確認（2026-09-02 / 09-03）。
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

export type PaymentKey = "transfer" | "cod";

export const PAYMENT: { key: PaymentKey; label: string; desc: string }[] = [
  {
    key: "transfer",
    label: "銀行匯款 / ATM 轉帳",
    desc: "下單後顯示匯款帳號，轉帳完成再回填末五碼，我們核對後出貨。",
  },
  {
    key: "cod",
    label: "貨到付款",
    desc: "宅配到府時直接付現給宅配人員，不另收手續費。",
  },
];

export const PAYMENT_LABEL: Record<PaymentKey, string> = {
  transfer: "銀行匯款 / ATM 轉帳",
  cod: "貨到付款",
};

export const isPayment = (v: unknown): v is PaymentKey => v === "transfer" || v === "cod";

/** 需要客人自行回報付款的方式（貨到付款不用——錢是當面給宅配的） */
export const needsPaymentReport = (p: PaymentKey): boolean => p !== "cod";

// ── 運費 ──────────────────────────────────────────────────────
// 客戶確認（2026-09-02）：運費 160，滿 2000 免運，貨到付款不另收手續費。
export const SHIPPING_FEE = 160;
export const FREE_SHIPPING_OVER = 2000;

/**
 * 匯款帳號（客戶 2026-09-03 提供實體印章照片）。
 *
 * 戶名是「王龍楨」而不是站上其他地方用的「王龍」——那是本名，
 * 轉帳時收款人姓名要對得起來，這一欄不要跟品牌上的稱呼統一。
 *
 * 全部留空時訂單完成頁會退成「我們會與您聯絡提供帳號」，
 * 不會顯示假帳號——改動這裡前請再跟客戶核對一次數字。
 */
export const BANK = {
  bankName: "台東縣鹿野地區農會（本會）",
  bankCode: "622",
  account: "00077220928010",
  accountName: "王龍楨",
};

export const bankReady = () => Boolean(BANK.bankName && BANK.account);

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
/*
 * payment 目前不影響任何金額（兩種付款方式都不加收費用），但保留這個參數：
 * 「付款方式會不會改變總額」是結帳頁的核心問題，簽章留著，
 * 日後客戶要加手續費時只需要改這一支，不必再把參數穿回所有呼叫端。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return {
    lines,
    bundles,
    listTotal,
    discount,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    count,
  };
}

export const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;
