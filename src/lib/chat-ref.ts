// 「AI 客服帶來的生意」來源標記。前後端共用，所以這支不能 import 任何伺服器套件。
//
// 客服附的自家連結會帶 ?ref=line-ai／web-ai。客人點進來後我們在瀏覽器記 30 天，
// 之後他送出諮詢或結帳時一起送上來，詢問單與訂單就知道是不是客服帶來的。
// 只記這兩個固定值、不記任何個人資料。

export const CHAT_REFS = ["line-ai", "web-ai"] as const;
export type ChatRef = (typeof CHAT_REFS)[number];

export const CHAT_REF_KEY = "avalo-chat-ref";
export const CHAT_REF_DAYS = 30;

export const isChatRef = (v: unknown): v is ChatRef =>
  typeof v === "string" && (CHAT_REFS as readonly string[]).includes(v);

export const CHAT_REF_LABEL: Record<ChatRef, string> = {
  "line-ai": "LINE AI 客服",
  "web-ai": "官網 AI 客服",
};

/** 瀏覽器端：讀出 30 天內的來源標記。無痕模式、擋儲存、過期都回 undefined。 */
export function readChatRef(): ChatRef | undefined {
  try {
    const raw = localStorage.getItem(CHAT_REF_KEY);
    if (!raw) return undefined;
    const { ref, at } = JSON.parse(raw) as { ref?: unknown; at?: number };
    if (!isChatRef(ref) || typeof at !== "number") return undefined;
    if (Date.now() - at > CHAT_REF_DAYS * 86_400_000) return undefined;
    return ref;
  } catch {
    return undefined;
  }
}

/** 瀏覽器端：網址帶 ?ref= 時記下來。回傳記到的值（沒有就 undefined）。 */
export function captureChatRef(search: string): ChatRef | undefined {
  const ref = new URLSearchParams(search).get("ref");
  if (!isChatRef(ref)) return undefined;
  try {
    localStorage.setItem(CHAT_REF_KEY, JSON.stringify({ ref, at: Date.now() }));
  } catch {
    /* 存不進去就算了，不影響瀏覽 */
  }
  return ref;
}
