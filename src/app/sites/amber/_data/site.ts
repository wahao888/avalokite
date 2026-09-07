// 站台常數與收款資訊。
//
// 這裡只放「請客人來付款」需要的公開資訊，不是任何金流憑證。
// 未填時前台與通知文字會退成「我們會與您聯絡提供帳號」，不會顯示空白欄位。

import { getTenant, tenantOrigin } from "@/lib/tenants";

export const TENANT_SLUG = "amber";

export const SITE = {
  name: "Amber 代購連線",
  shortName: "Amber",
  tagline: "韓國・日本連線代購",
  /** TODO(客戶確認)：正式的品牌名與 slogan */
  lineId: "", // TODO(客戶確認)：LINE 官方帳號 ID，例：@amber
  email: "",
  /** 上線前與 tenants.ts 的 indexable 一起翻成 true */
  indexable: false,
} as const;

export const ORIGIN = tenantOrigin(getTenant(TENANT_SLUG)!);

/** 匯款帳號。TODO(客戶確認)：Amber 尚未提供 */
export const BANK = {
  bankName: "",
  bankCode: "",
  account: "",
  holder: "",
} as const;

export const bankReady = (): boolean =>
  Boolean(BANK.bankName && BANK.account && BANK.holder);

/** LINE Pay 收款方式。TODO(客戶確認) */
export const LINEPAY = {
  lineId: "",
  payLink: "",
} as const;

export const linePayReady = (): boolean =>
  Boolean(LINEPAY.lineId || LINEPAY.payLink);

export const PAYMENTS = ["transfer", "linepay"] as const;
export type PaymentKey = (typeof PAYMENTS)[number];

export const PAYMENT_ZH: Record<PaymentKey, string> = {
  transfer: "銀行匯款",
  linepay: "LINE Pay",
};

export const isPayment = (v: unknown): v is PaymentKey =>
  typeof v === "string" && (PAYMENTS as readonly string[]).includes(v);

/** 運送方式 */
export const SHIP_KINDS = ["cvs", "home"] as const;
export type ShipKind = (typeof SHIP_KINDS)[number];

export const SHIP_KIND_ZH: Record<ShipKind, string> = {
  cvs: "超商取貨",
  home: "宅配到府",
};

export const isShipKind = (v: unknown): v is ShipKind =>
  typeof v === "string" && (SHIP_KINDS as readonly string[]).includes(v);

/**
 * 超商品牌。第一期客人自己打門市名稱與店號（不串電子地圖 API——
 * 那要跟綠界物流申辦，排第二期）。品牌用選的，減少打錯的機會。
 */
export const CVS_BRANDS = [
  { key: "seven", name: "7-ELEVEN" },
  { key: "family", name: "全家" },
  { key: "hilife", name: "萊爾富" },
  { key: "okmart", name: "OK mart" },
] as const;

export const cvsBrandName = (key: string | null | undefined): string =>
  CVS_BRANDS.find((b) => b.key === key)?.name ?? "";
