import { createCipheriv, createDecipheriv } from "node:crypto";
import { z } from "zod";

const responseSchema = z.object({
  MerchantID: z.union([z.string(), z.number()]).optional(),
  TransCode: z.coerce.number().int(),
  Data: z.string().nullish(),
});
const resultSchema = z.object({ RtnCode: z.coerce.number().int() }).passthrough();

export function invoiceEnvironment() {
  return process.env.ECPAY_ENV === "production" ? "production" : "stage";
}

export function invoiceStartAt() {
  const value = process.env.ECPAY_INVOICE_START_AT ?? "";
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? Date.parse(value)
    : NaN;
}

export function invoiceCredentials() {
  const merchantId = process.env.ECPAY_INVOICE_MERCHANT_ID ?? "";
  const key = Buffer.from(process.env.ECPAY_INVOICE_HASH_KEY ?? "");
  const iv = Buffer.from(process.env.ECPAY_INVOICE_HASH_IV ?? "");
  if (!/^\d{1,10}$/.test(merchantId) || key.length !== 16 || iv.length !== 16) {
    throw new Error("發票介接設定不完整");
  }
  return { merchantId, key, iv };
}

// ECPay: JSON -> URL encode -> AES-128-CBC/PKCS7 -> Base64.
export async function invoiceApi(
  operation: "Issue" | "GetIssue" | "CheckBarcode",
  data: Record<string, unknown>,
) {
  const { merchantId, key, iv } = invoiceCredentials();
  const origin = invoiceEnvironment() === "production"
    ? "https://einvoice.ecpay.com.tw"
    : "https://einvoice-stage.ecpay.com.tw";
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  const encoded = new URLSearchParams({ data: JSON.stringify({ ...data, MerchantID: merchantId }) })
    .toString().slice("data=".length);
  const encrypted = cipher.update(encoded, "utf8", "base64") + cipher.final("base64");
  const response = await fetch(`${origin}/B2CInvoice/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      MerchantID: merchantId,
      RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
      Data: encrypted,
    }),
    signal: AbortSignal.timeout(8_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`${operation} HTTP ${response.status}`);

  // 只保留錯誤代碼，避免把發票內容或個資寫進 log。
  const envelope = responseSchema.safeParse(await response.json());
  if (!envelope.success) throw new Error(`${operation} 回傳格式異常`);
  const { MerchantID, TransCode, Data } = envelope.data;
  if (TransCode !== 1) throw new Error(`${operation} TransCode=${TransCode}`);
  if (!Data || String(MerchantID) !== merchantId) throw new Error(`${operation} 回傳商家或資料異常`);
  try {
    const decipher = createDecipheriv("aes-128-cbc", key, iv);
    const plaintext = decipher.update(Data, "base64", "utf8") + decipher.final("utf8");
    return resultSchema.parse(JSON.parse(decodeURIComponent(plaintext.replace(/\+/g, " "))));
  } catch {
    throw new Error(`${operation} 回傳資料解碼失敗`);
  }
}
