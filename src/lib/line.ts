// LINE Messaging API 的最小客戶端：簽章驗證與送訊息。
//
// 刻意不裝 @line/bot-sdk：我們只用到三個 HTTP 端點和一個 HMAC，
// 多一個相依就多一條要跟著 Next 版本升級的鏈子。

import crypto from "node:crypto";

// 變數名刻意帶 _OA_：LINE_CHANNEL_SECRET 已經是 LINE Login（會員登入）那支
// channel 的，兩者是不同 channel、不同密鑰，共用一個名字會讓其中一邊壞掉。

const API = "https://api.line.me/v2/bot";

/**
 * 一組官方帳號的憑證。
 *
 * 每個客戶有自己的 LINE 官方帳號，secret 與 token 都不一樣——共用一組等於
 * 所有客戶的對話都進同一個帳號，而且任何一個客戶的 secret 外洩就能偽造
 * 所有人的 webhook。所以憑證一路當參數傳，不在這一層讀全域設定。
 */
export interface LineCreds {
  secret?: string;
  token?: string;
}

/** 主站自己的官方帳號（@958nplck）。沒傳憑證時就用這組。 */
export const houseCreds = (): LineCreds => ({
  secret: process.env.LINE_OA_CHANNEL_SECRET,
  token: process.env.LINE_OA_CHANNEL_ACCESS_TOKEN,
});

/** 客戶站的官方帳號。環境變數名寫在 tenants.ts，值只存在伺服器的 .env。 */
export const tenantCreds = (t: {
  aiSupport?: { lineSecretEnv?: string; lineTokenEnv?: string };
}): LineCreds => ({
  secret: t.aiSupport?.lineSecretEnv ? process.env[t.aiSupport.lineSecretEnv] : undefined,
  token: t.aiSupport?.lineTokenEnv ? process.env[t.aiSupport.lineTokenEnv] : undefined,
});

export const lineConfigured = (creds: LineCreds = houseCreds()) =>
  !!creds.secret && !!creds.token;

/**
 * 驗證 x-line-signature。
 *
 * 必須拿「未經解析的原始 body 字串」來算，JSON.parse 再 stringify 出來的
 * 字串和 LINE 送來的位元組不保證一樣，簽章就會對不起來。
 * 用 timingSafeEqual 而不是 ===：字串比較會提早回傳，洩漏比對進度。
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  creds: LineCreds = houseCreds(),
): boolean {
  const secret = creds.secret;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function call(path: string, body: unknown, creds: LineCreds): Promise<boolean> {
  const token = creds.token;
  if (!token) {
    console.warn(`[line] 沒有 access token，略過送出 ${path}`);
    return false;
  }
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[line] ${path} ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[line] ${path} 連線失敗`, err);
    return false;
  }
}

/** 回覆訊息。replyToken 只能用一次、約一分鐘內有效，且這條不計入 LINE 的訊息則數。 */
export const replyText = (replyToken: string, text: string, creds: LineCreds = houseCreds()) =>
  call("/message/reply", { replyToken, messages: [{ type: "text", text }] }, creds);

/** 主動推播。這條會吃掉方案的免費則數，只在真的必要時使用。 */
export const pushText = (to: string, text: string, creds: LineCreds = houseCreds()) =>
  call("/message/push", { to, messages: [{ type: "text", text }] }, creds);

export interface LineEvent {
  type: string;
  /** 事件的唯一 id，重送時維持不變——去重就靠它。 */
  webhookEventId?: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; id: string; text?: string };
  deliveryContext?: { isRedelivery: boolean };
  timestamp?: number;
}

/** 取得使用者顯示名稱；失敗不是致命錯誤，回 null 讓呼叫端自己決定。 */
export async function getDisplayName(
  userId: string,
  creds: LineCreds = houseCreds(),
): Promise<string | null> {
  const token = creds.token;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { displayName?: string };
    return data.displayName ?? null;
  } catch {
    return null;
  }
}
