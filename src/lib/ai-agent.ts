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
  reply: z.string().describe("要傳給客人看的訊息，繁體中文，150 字以內"),
  needs_human: z.boolean().describe("是否需要轉給專人：報價客製、議價、客訴、或連續答不出來"),
  handoff_reason: z.string().describe("需要轉人的原因，一句話；不需要時填空字串"),
});

export interface AgentTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentAnswer {
  reply: string;
  needsHuman: boolean;
  handoffReason: string;
  /** 這次呼叫實際用掉的 token，寫進對話紀錄供每月用量報表統計。 */
  usage: { input: number; output: number; cacheRead: number };
}

// API 掛掉時的回覆。沈默是最糟的處理：客人會以為沒人理他。
const FALLBACK: AgentAnswer = {
  reply: "不好意思，系統剛才有點狀況。請再傳一次訊息，或留下您的稱呼與聯絡方式，我們請專人與您聯繫。",
  needsHuman: true,
  handoffReason: "AI 回覆失敗",
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
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: "user" as const, content: userText },
      ],
      response_format: zodResponseFormat(AnswerSchema, "support_answer"),
    });

    const parsed = res.choices[0]?.message.parsed;
    if (!parsed?.reply?.trim()) return FALLBACK;

    return {
      reply: parsed.reply.trim(),
      needsHuman: parsed.needs_human,
      handoffReason: parsed.handoff_reason,
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
