import crypto from "crypto";

// 綠界 ECPay 串接：全方位金流 AIO（一次性）＋ 信用卡定期定額（月費訂閱）
// 文件：https://developers.ecpay.com.tw/?p=2509（AIO）、?p=2868（定期定額）

const STAGE_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
const PROD_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";

export function ecpayConfig() {
  const merchantId = process.env.ECPAY_MERCHANT_ID;
  const hashKey = process.env.ECPAY_HASH_KEY;
  const hashIv = process.env.ECPAY_HASH_IV;
  if (!merchantId || !hashKey || !hashIv) {
    throw new Error("ECPay env vars missing (ECPAY_MERCHANT_ID / HASH_KEY / HASH_IV)");
  }
  return {
    merchantId,
    hashKey,
    hashIv,
    actionUrl: process.env.ECPAY_ENV === "production" ? PROD_URL : STAGE_URL,
  };
}

// .NET 風格 URL encode：空白→+、保留 -_.!*()，其餘百分號編碼後轉小寫
function dotNetUrlEncode(s: string): string {
  return encodeURIComponent(s)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2a/g, "*")
    .replace(/%2d/g, "-")
    .replace(/%2e/g, ".")
    .replace(/%5f/g, "_");
}

export function checkMacValue(params: Record<string, string>): string {
  const { hashKey, hashIv } = ecpayConfig();
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIv}`;
  const encoded = dotNetUrlEncode(raw);
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyCheckMac(params: Record<string, string>): boolean {
  const received = params.CheckMacValue;
  if (!received) return false;
  return checkMacValue(params) === received.toUpperCase();
}

function tradeDate(d = new Date()): string {
  // 綠界要求 yyyy/MM/dd HH:mm:ss（台北時間）
  const tw = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${tw.getFullYear()}/${p(tw.getMonth() + 1)}/${p(tw.getDate())} ${p(tw.getHours())}:${p(tw.getMinutes())}:${p(tw.getSeconds())}`;
}

export interface EcpayFormPayload {
  action: string;
  fields: Record<string, string>;
}

interface BaseTradeOptions {
  merchantTradeNo: string; // <=20 英數字
  totalAmount: number; // 含稅整數
  itemName: string; // 多品項以 # 分隔，<=400 字
  tradeDesc: string;
  clientBackUrl: string; // 付款完成返回按鈕
  orderResultUrl: string; // 信用卡完成後 POST 結果（client 端）
  returnUrl: string; // server-to-server 通知
}

// 一次性付款（信用卡／ATM／超商代碼）
export function buildAioCheckout(opts: BaseTradeOptions): EcpayFormPayload {
  const { merchantId, actionUrl } = ecpayConfig();
  const fields: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: opts.merchantTradeNo,
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: String(opts.totalAmount),
    TradeDesc: opts.tradeDesc,
    ItemName: opts.itemName,
    ReturnURL: opts.returnUrl,
    OrderResultURL: opts.orderResultUrl,
    ClientBackURL: opts.clientBackUrl,
    ChoosePayment: "ALL",
    EncryptType: "1",
    NeedExtraPaidInfo: "N",
  };
  fields.CheckMacValue = checkMacValue(fields);
  return { action: actionUrl, fields };
}

// 信用卡定期定額（每月自動扣款）
export function buildPeriodCheckout(
  opts: BaseTradeOptions & {
    periodReturnUrl: string; // 每期扣款結果通知
    execTimes?: number; // 含首期，月繳最多 99
  }
): EcpayFormPayload {
  const { merchantId, actionUrl } = ecpayConfig();
  const fields: Record<string, string> = {
    MerchantID: merchantId,
    MerchantTradeNo: opts.merchantTradeNo,
    MerchantTradeDate: tradeDate(),
    PaymentType: "aio",
    TotalAmount: String(opts.totalAmount), // 須等於 PeriodAmount
    TradeDesc: opts.tradeDesc,
    ItemName: opts.itemName,
    ReturnURL: opts.returnUrl,
    OrderResultURL: opts.orderResultUrl,
    ClientBackURL: opts.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
    NeedExtraPaidInfo: "N",
    PeriodAmount: String(opts.totalAmount),
    PeriodType: "M",
    Frequency: "1",
    ExecTimes: String(opts.execTimes ?? 99),
    PeriodReturnURL: opts.periodReturnUrl,
  };
  fields.CheckMacValue = checkMacValue(fields);
  return { action: actionUrl, fields };
}

// 產生訂單編號：AVL + base36 秒級時間 + 4 碼亂數（總長 ~14，留空間給尾碼）
export function genOrderId(): string {
  const ts = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").slice(0, 4).toUpperCase();
  return `AVL${ts}${rand}`;
}
