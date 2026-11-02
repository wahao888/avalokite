// AI 客服的大腦。LINE 與網站聊天共用同一套，所以講法不會兩邊不一致。

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { buildKnowledge } from "@/lib/ai-knowledge";

// 客服問答短、量大，Haiku 已足夠；要換模型改這個環境變數即可，不必動程式。
const MODEL = process.env.AI_MODEL ?? "claude-haiku-5-5";

// 帶進模型的歷史對話輪數。再多的脈絡對客服問答沒有幫助，只是讓每則都變貴。
export const HISTORY_TURNS = 10;

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

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

export async function answer(history: AgentTurn[], userText: string): Promise<AgentAnswer> {
  if (!aiConfigured()) return FALLBACK;

  try {
    const res = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: buildKnowledge(),
          // 知識庫整包是固定前綴，快取後每則對話只付約一成的輸入成本。
          cache_control: { type: "ephemeral" },
        },
      ],
      // 客服問答不需要深度推理，壓到最低換取回覆速度。
      output_config: { effort: "low", format: zodOutputFormat(AnswerSchema) },
      messages: [
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: "user" as const, content: userText },
      ],
    });

    const parsed = res.parsed_output;
    if (!parsed?.reply?.trim()) return FALLBACK;

    return {
      reply: parsed.reply.trim(),
      needsHuman: parsed.needs_human,
      handoffReason: parsed.handoff_reason,
      usage: {
        input: res.usage.input_tokens,
        output: res.usage.output_tokens,
        cacheRead: res.usage.cache_read_input_tokens ?? 0,
      },
    };
  } catch (err) {
    console.error("[ai-agent] 回覆失敗", err);
    return FALLBACK;
  }
}
