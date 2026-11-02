// LINE Messaging API 的最小客戶端：簽章驗證與送訊息。
//
// 刻意不裝 @line/bot-sdk：我們只用到三個 HTTP 端點和一個 HMAC，
// 多一個相依就多一條要跟著 Next 版本升級的鏈子。

import crypto from "node:crypto";

// 變數名刻意帶 _OA_：LINE_CHANNEL_SECRET 已經是 LINE Login（會員登入）那支
// channel 的，兩者是不同 channel、不同密鑰，共用一個名字會讓其中一邊壞掉。

const API = "https://api.line.me/v2/bot";

export const lineConfigured = () =>
  !!process.env.LINE_OA_CHANNEL_SECRET && !!process.env.LINE_OA_CHANNEL_ACCESS_TOKEN;

/**
 * 驗證 x-line-signature。
 *
 * 必須拿「未經解析的原始 body 字串」來算，JSON.parse 再 stringify 出來的
 * 字串和 LINE 送來的位元組不保證一樣，簽章就會對不起來。
 * 用 timingSafeEqual 而不是 ===：字串比較會提早回傳，洩漏比對進度。
 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_OA_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function call(path: string, body: unknown): Promise<boolean> {
  const token = process.env.LINE_OA_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("[line] 未設定 LINE_OA_CHANNEL_ACCESS_TOKEN，略過送出");
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
export const replyText = (replyToken: string, text: string) =>
  call("/message/reply", { replyToken, messages: [{ type: "text", text }] });

/** 主動推播。這條會吃掉方案的免費則數，只在真的必要時使用。 */
export const pushText = (to: string, text: string) =>
  call("/message/push", { to, messages: [{ type: "text", text }] });

export interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; id: string; text?: string };
  deliveryContext?: { isRedelivery: boolean };
  timestamp?: number;
}

/** 取得使用者顯示名稱；失敗不是致命錯誤，回 null 讓呼叫端自己決定。 */
export async function getDisplayName(userId: string): Promise<string | null> {
  const token = process.env.LINE_OA_CHANNEL_ACCESS_TOKEN;
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
