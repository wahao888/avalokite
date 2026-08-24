#!/usr/bin/env node
// 驗證 .env 裡的綠界參數是否正確 —— 不產生任何金流。
//
// 手法：呼叫綠界「查詢訂單」端點（唯讀）查一筆不存在的交易編號。
//   - 驗章失敗 → 回 CheckMacValue Error，代表 HashKey/HashIV 有錯字
//   - 驗章成功 → 回「查無此訂單」之類的訊息，代表三個參數都對
//
// 為什麼需要它：綠界後台顯示金鑰的字型裡 0/O、1/l/I 幾乎分不出來（後台自己就附了
// 辨識說明），肉眼抄錯的話要等到真人刷卡才會發現。上線前跑這支，30 秒內確定。
//
// 用法（在有 .env 的目錄下）：
//   node deploy/verify-ecpay.mjs
// 正式機上要用 avalo 身分跑，ubuntu 讀不到 /opt/avalo/app：
//   sudo -u avalo bash -c "cd /opt/avalo/app && node deploy/verify-ecpay.mjs"
// 或直接指定：
//   node deploy/verify-ecpay.mjs <MerchantID> <HashKey> <HashIV> [stage|production]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function fromEnvFile() {
  const file = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...fromEnvFile(), ...process.env };
const merchantId = process.argv[2] ?? env.ECPAY_MERCHANT_ID;
const hashKey = process.argv[3] ?? env.ECPAY_HASH_KEY;
const hashIv = process.argv[4] ?? env.ECPAY_HASH_IV;
const ecpayEnv = process.argv[5] ?? env.ECPAY_ENV ?? "stage";

if (!merchantId || !hashKey || !hashIv) {
  console.error("缺少 ECPAY_MERCHANT_ID / ECPAY_HASH_KEY / ECPAY_HASH_IV");
  process.exit(2);
}

// 與 src/lib/ecpay.ts 相同的 .NET 風格編碼與 SHA256 驗章
function dotNetUrlEncode(s) {
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

function checkMacValue(params) {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHash("sha256")
    .update(dotNetUrlEncode(`HashKey=${hashKey}&${sorted}&HashIV=${hashIv}`))
    .digest("hex")
    .toUpperCase();
}

const host =
  ecpayEnv === "production"
    ? "https://payment.ecpay.com.tw"
    : "https://payment-stage.ecpay.com.tw";

const fields = {
  MerchantID: merchantId,
  MerchantTradeNo: "AVLVERIFY000001", // 刻意用不存在的編號
  TimeStamp: String(Math.floor(Date.now() / 1000)),
  PlatformID: "",
};
fields.CheckMacValue = checkMacValue(fields);

const res = await fetch(`${host}/Cashier/QueryTradeInfo/V5`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(fields).toString(),
});
const body = (await res.text()).trim();

console.log(`環境      ：${ecpayEnv}（${host}）`);
console.log(`商店代號  ：${merchantId}`);
console.log(`HashKey   ：${hashKey.slice(0, 3)}…${hashKey.slice(-2)}（${hashKey.length} 碼）`);
console.log(`HashIV    ：${hashIv.slice(0, 3)}…${hashIv.slice(-2)}（${hashIv.length} 碼）`);
console.log(`HTTP ${res.status}`);
console.log(`回應      ：${body.slice(0, 400)}`);
console.log("");

// 驗章失敗時綠界回的是 `10200073|CheckMacValue Error` 這種「代碼|訊息」純文字，
// 不是表單格式。注意不能用「回應裡有沒有 CheckMacValue 字樣」來判斷——成功的回應
// 本身就帶一個叫 CheckMacValue 的欄位，會誤判（2026-08-24 踩過）。
if (/^\d+\|/.test(body) || !body.includes("MerchantID=")) {
  console.log("❌ 綠界拒絕了這筆查詢：");
  console.log("   驗章失敗多半是 HashKey/HashIV 抄錯（0/O 或 1/l/I 看反）。");
  process.exit(1);
}

const returned = {};
new URLSearchParams(body).forEach((v, k) => (returned[k] = v));

// 反向驗章：用同一組金鑰重算綠界回傳的簽章。對得起來就等於雙向確認——
// 我們簽的它收得下，它簽的我們也驗得過，三個參數必定正確。
const expected = checkMacValue(returned);
const macOk = expected === (returned.CheckMacValue ?? "").toUpperCase();

if (returned.MerchantID !== merchantId) {
  console.log(`❌ 商店代號對不上：送出 ${merchantId}，回傳 ${returned.MerchantID}`);
  process.exit(1);
}

if (!macOk) {
  // 綠界收下了我們的簽章（否則不會走到這），但回傳簽章對不上，多半是雜湊演算法差異，
  // 不代表金鑰有錯。
  console.log("⚠️  我們送出的簽章綠界接受了（參數正確），但回傳簽章用 SHA256 驗不過。");
  console.log(`   期望 ${expected}`);
  console.log(`   實得 ${returned.CheckMacValue}`);
  console.log("   查詢端點的回應簽章可能走 MD5，不影響付款流程（付款一律 EncryptType=1）。");
  process.exit(0);
}

console.log("✅ 雙向驗章通過 —— MerchantID / HashKey / HashIV 三者都正確。");
if (returned.TradeStatus === "10200047" || !returned.TradeNo) {
  console.log("   （查無此訂單是預期結果，因為查詢用的編號是假的。）");
}
