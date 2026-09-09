// 站台常數與收款資訊。
//
// 這裡只放「請客人來付款」需要的公開資訊，不是任何金流憑證。
// 未填時前台與通知文字會退成「我們會與您聯絡提供帳號」，不會顯示空白欄位。

import { getTenant, tenantOrigin } from "@/lib/tenants";

export const TENANT_SLUG = "amber";

export const SITE = {
  name: "AmberPick",
  shortName: "AmberPick",
  tagline: "各國連線代購・正品直送",
  lineId: "@004vrybx",
  /** 加好友連結（客戶提供的正式網址） */
  lineAddUrl: "https://page.line.me/004vrybx",
  email: "amber250287@gmail.com",
  /** 上線前與 tenants.ts 的 indexable 一起翻成 true */
  indexable: false,
} as const;

export const ORIGIN = tenantOrigin(getTenant(TENANT_SLUG)!);

/**
 * 匯款帳號（客戶 2026-09-09 提供）。
 *
 * ⚠ 這是要**給客人看**的收款資訊，會顯示在結單頁與請款文字裡——
 * 它本來就是公開的，不是憑證。真正的秘密（後台密碼、金流金鑰）
 * 一律只在伺服器的 .env，不進 repo。
 *
 * TODO(客戶確認)：戶名。沒有戶名時結單頁只顯示銀行與帳號，
 * 客人匯款時填不了受款人姓名，臨櫃匯款會被卡住。
 */
export const BANK = {
  bankName: "國泰世華銀行",
  bankCode: "013",
  account: "699512448171",
  holder: "",
} as const;

// 戶名還沒拿到，所以不列入必要條件——有銀行與帳號就足以讓客人轉帳，
// 少了戶名只是臨櫃比較麻煩。等她補上會自動顯示。
export const bankReady = (): boolean =>
  Boolean(BANK.bankName && BANK.account);

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
 * 超商取貨的品牌。第一期客人自己打門市名稱與店號
 * （不串電子地圖 API——那要跟綠界物流申辦，排第二期）。
 *
 * 客戶 2026-09-09 補充「全家取貨（先付款）$60」，所以加回全家。
 * ⚠ 仍然**不列萊爾富與 OK**——她沒有說她寄得出去。
 * 客人選了她寄不出去的超商，會變成一筆要重新聯絡、重新確認門市的訂單。
 */
export const CVS_BRANDS = [
  { key: "seven", name: "7-ELEVEN" },
  { key: "family", name: "全家" },
] as const;

export const cvsBrandName = (key: string | null | undefined): string =>
  CVS_BRANDS.find((b) => b.key === key)?.name ?? "";

/**
 * 購買規範。逐字取自客戶提供的出貨說明（2026-09-07），**不要潤飾**——
 * 這是她對客人的承諾與免責範圍，改一個字就可能改變意思。
 *
 * 前台在結帳前與結單頁都要顯示：客人事後說「我不知道不能退」時，
 * 唯一站得住腳的是「你下單前看得到」。
 */
export const TERMS = {
  flow: [
    "確認商品",
    "報價",
    "確認下單",
    "匯款",
    "採買",
    "寄回台灣",
  ],
  shipping: [
    "各國品牌、官網、門市正品代購",
    "採預購制，下單付款後才會安排採買",
    "商品抵台後會檢查商品並安排寄出",
    // 2026-09-09 客戶補充全家與宅配之後改寫。原文只寫「7-11 交貨便／賣貨便」，
    // 但那已經與她公告的運費表不符——規範是爭議時的依據，不能跟收費方式打架。
    // TODO(客戶確認)：這句的正式措辭請 Amber 過目。
    "寄送方式：7-11 或全家取貨、宅配到府（皆為先付款）",
    "收到商品請錄影開箱，保障彼此權益",
  ],
  noRefund: [
    "取消訂單",
    "退貨／換貨",
    "因個人喜好、尺寸不合、色差、味道等因素退換",
    "國際運送造成外盒輕微壓痕",
  ],
  notice: "下單前請再次確認商品資訊，下單即表示同意以上規範。",
} as const;
