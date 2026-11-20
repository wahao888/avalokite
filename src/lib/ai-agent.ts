// AI 客服的大腦。LINE 與網站聊天共用同一套，所以講法不會兩邊不一致。

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// 客服問答短、量大，luna 等級已足夠；要換模型改這個環境變數即可，不必動程式。
const MODEL = process.env.AI_MODEL || "gpt-6-luna";

// 客服是查表式問答，不需要推理，關掉換取速度與成本：開著的話每則會多燒
// 50–80 個看不到的 reasoning token，回覆也慢上快一秒。
// 這個參數只有新世代模型吃得到；換成 gpt-4.1 這類舊模型要設成 "off"，
// 整個參數就不會送出（設成空字串是「沒設定」，仍會用預設的 none）。
const EFFORT = process.env.AI_REASONING_EFFORT || "none";

// 帶進模型的歷史對話輪數。再多的脈絡對客服問答沒有幫助，只是讓每則都變貴。
export const HISTORY_TURNS = 10;

export const aiConfigured = () => !!process.env.OPENAI_API_KEY;

let client: OpenAI | null = null;
const getClient = () => (client ??= new OpenAI());

// strict 模式要求每個欄位都是必填，所以「不需要轉人」時 handoff_reason 填空字串，
// 而不是做成 optional——做成 optional 會被 API 直接退回。
const AnswerSchema = z.object({
  reply: z.string().describe("要傳給客人看的訊息，繁體中文，200 字以內；用換行分段、每筆費用獨立一行，不用 Markdown"),
  needs_human: z.boolean().describe("是否需要通知專人：客製報價、議價、既有客戶帳務或客訴、客人明確要找真人、或連續答不出來。想下單、要詢價單不算"),
  handoff_reason: z.string().describe("需要轉人的原因，一句話；不需要時填空字串"),
  quick_replies: z
    .array(z.string())
    .describe("0–3 個客人下一步最可能想說的話，做成可點的按鈕；每個 12 字以內，用客人的口吻；不需要時給空陣列"),
});

/** LINE 的快速回覆按鈕最多 13 顆、標籤 20 字；我們只給 3 顆、12 字，按鈕太多客人反而不知道點哪個。 */
export const MAX_QUICK_REPLIES = 3;
export const QUICK_REPLY_MAX_CHARS = 12;

/**
 * 連結如果被接在最後的問句後面，挪到問句前面。
 *
 * 客人讀到問句就會開始想答案、點按鈕；問句後面再冒出一行網址，看起來像話沒說完。
 * 規則裡寫了「連結放在問句前」，模型仍常常放錯，這種排版小事交給程式最穩。
 */
export function tidyReply(text: string): string {
  const lines = text.split("\n");
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  const last = lines.at(-1)?.trim() ?? "";
  if (!/^\S*https?:\/\/\S+$/.test(last)) return text.trim();
  let q = lines.length - 2;
  while (q >= 0 && !lines[q].trim()) q--;
  if (q < 0 || !/[？?]$/.test(lines[q].trim())) return text.trim();
  // 問句可能和前一句同一行（「……雙通道方案。您想要哪一種？」），只把問句那一小段往後挪
  const qLine = lines[q];
  const m = qLine.match(/^(.*[。！!])\s*([^。！!]*[？?])$/);
  const before = lines.slice(0, q);
  const head = m ? [...before, m[1]] : before;
  const question = m ? m[2] : qLine.trim();
  return [...head, last, "", question].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 模型偶爾會超出字數或給重複的按鈕，送出去之前一律在這裡修掉——LINE 遇到超長標籤會整則退件。 */
export function cleanQuickReplies(raw: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw ?? []) {
    const label = r.trim().replace(/\s+/g, " ");
    if (!label || label.length > QUICK_REPLY_MAX_CHARS || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length === MAX_QUICK_REPLIES) break;
  }
  return out;
}

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentAnswer {
  reply: string;
  needsHuman: boolean;
  handoffReason: string;
  /** 可點的建議回覆，已清理過（最多 3 個、每個 12 字以內） */
  quickReplies: string[];
  /** 這次是 API 失敗後的備用回覆，不是模型的判斷（見 chat-service 的處理） */
  failed?: boolean;
  /** 這次呼叫實際用掉的 token，寫進對話紀錄供每月用量報表統計。 */
  usage: { input: number; output: number; cacheRead: number };
}

// API 掛掉時的回覆。沈默是最糟的處理：客人會以為沒人理他。
// needsHuman 是 false：一次暫時性的 API 錯誤不該讓這段 LINE 對話靜音 12 小時——
// 客人下一句重問時，API 多半已經恢復了。站方另外會收到一封「AI 回覆失敗」的提醒。
const FALLBACK: AgentAnswer = {
  reply: "不好意思，系統剛才有點狀況。請再傳一次訊息，或留下您的稱呼與聯絡方式，我們請專人與您聯繫。",
  needsHuman: false,
  handoffReason: "AI 回覆失敗",
  quickReplies: [],
  failed: true,
  usage: { input: 0, output: 0, cacheRead: 0 },
};

/**
 * 問一次模型。
 *
 * knowledge 由呼叫端決定——主站用 products.ts 當場算出來的那份，客戶站用
 * 自己存的。這一層刻意不知道租戶是誰：它只負責「把這份知識餵進去、把結構化
 * 的回答拿回來」，租戶的判斷留在 chat-service 一個地方做。
 *
 * knowledge 放在 messages[0] 且內容穩定，是 prompt caching 命中的前提：
 * 實測快取命中率約九成，輸入成本因此只有牌價的十分之一。
 */
export async function answer(
  history: AgentTurn[],
  userText: string,
  knowledge: string,
  context?: string,
): Promise<AgentAnswer> {
  if (!aiConfigured()) return FALLBACK;

  try {
    const res = await getClient().chat.completions.parse({
      model: MODEL,
      ...(EFFORT === "off" ? {} : { reasoning_effort: EFFORT as "none" | "low" | "medium" | "high" }),
      max_completion_tokens: 800,
      // 知識庫固定擺在最前面：OpenAI 會自動快取夠長的共同前綴，
      // 順序一變就整段失效，所以這一則永遠是 messages[0]。
      messages: [
        { role: "system", content: knowledge },
        // 每段對話都不一樣的資訊（客人稱呼等）放在知識庫「後面」另一則：
        // 塞進 messages[0] 會讓每位客人的前綴都不同，快取就整段失效。
        ...(context ? [{ role: "system" as const, content: context }] : []),
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: "user" as const, content: userText },
      ],
      response_format: zodResponseFormat(AnswerSchema, "support_answer"),
    });

    const parsed = res.choices[0]?.message.parsed;
    if (!parsed?.reply?.trim()) return FALLBACK;

    return {
      reply: tidyReply(parsed.reply),
      needsHuman: parsed.needs_human,
      handoffReason: parsed.handoff_reason,
      quickReplies: cleanQuickReplies(parsed.quick_replies),
      usage: {
        input: res.usage?.prompt_tokens ?? 0,
        output: res.usage?.completion_tokens ?? 0,
        cacheRead: res.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      },
    };
  } catch (err) {
    console.error("[ai-agent] 回覆失敗", err);
    return FALLBACK;
  }
}
