// 一則訊息進來到一則回覆出去的完整流程。LINE webhook 與網站聊天都走這裡。

import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";
import { answer, HISTORY_TURNS, type AgentTurn } from "@/lib/ai-agent";

export type ChatChannel = "line" | "web";

export interface IncomingMessage {
  channel: ChatChannel;
  /** LINE userId，或網站訪客的匿名 id */
  externalId: string;
  displayName?: string | null;
  text: string;
}

export async function handleMessage(msg: IncomingMessage): Promise<string> {
  const convo = await prisma.chatConversation.upsert({
    where: { channel_externalId: { channel: msg.channel, externalId: msg.externalId } },
    create: {
      channel: msg.channel,
      externalId: msg.externalId,
      displayName: msg.displayName ?? null,
    },
    // 顯示名稱可能第一次沒拿到，之後補上；拿不到就別用 null 蓋掉已有的值。
    update: msg.displayName ? { displayName: msg.displayName } : {},
  });

  const recent = await prisma.chatMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
  });
  const history: AgentTurn[] = recent
    .reverse()
    .map((m) => ({ role: m.role as AgentTurn["role"], content: m.content }));

  const result = await answer(history, msg.text);

  // 一筆 transaction 寫兩則訊息：只存到一半的對話會讓下一輪的脈絡是錯的。
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { conversationId: convo.id, role: "user", content: msg.text },
    }),
    prisma.chatMessage.create({
      data: {
        conversationId: convo.id,
        role: "assistant",
        content: result.reply,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        cacheReadTokens: result.usage.cacheRead,
      },
    }),
    prisma.chatConversation.update({
      where: { id: convo.id },
      data: { lastAt: new Date() },
    }),
  ]);

  await notifyIfNeeded(convo, msg, result, history);

  return result.reply;
}

// 台灣手機、市話、email。前面加 (?<!\d) 是因為沒有邊界的話，
// 金額或統編裡夾著的數字也會湊出一組「電話」。
const CONTACT_RE =
  /(?<!\d)(09\d{2}[-\s]?\d{3}[-\s]?\d{3}|0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4})(?!\d)|[\w.+-]+@[\w-]+\.[\w.]{2,}/;

/**
 * 客人留了手機、市話或 email —— 他是真的在等人回電，通知信的主旨要看得出來，
 * 不然一整串「客人補充訊息」長得都一樣，最該先開的那封就沉在裡面。
 */
export const looksLikeContact = (text: string): boolean => CONTACT_RE.test(text);

/**
 * 轉人通知。
 *
 * 首次判定要轉人時寄一封，**之後客人再說的每一句也都要寄**。
 * 原本只寄第一封，結果是：客人說「叫真人來」時寄出一封沒有聯絡方式的信，
 * 接著他留下姓名電話——那封最有價值的訊息反而不會通知任何人。
 * 2026-11-02 在正式站實測時抓到。
 *
 * 不怕被灌爆：notifyOwner 本身有每小時上限，超過會改寄一封彙總提醒。
 */
async function notifyIfNeeded(
  convo: { id: number; handoff: boolean; displayName: string | null },
  msg: IncomingMessage,
  result: { reply: string; needsHuman: boolean; handoffReason: string },
  history: AgentTurn[],
): Promise<void> {
  const firstTime = result.needsHuman && !convo.handoff;
  if (!firstTime && !convo.handoff) return;

  if (firstTime) {
    await prisma.chatConversation.update({
      where: { id: convo.id },
      data: { handoff: true, handoffAt: new Date(), handoffReason: result.handoffReason },
    });
  }

  const who = convo.displayName ?? msg.displayName ?? msg.externalId;
  const hasContact = looksLikeContact(msg.text);
  const subject = firstTime
    ? `[Avalo] AI 客服請求轉接 — ${who}（${msg.channel}）`
    : `[Avalo] 客人補充訊息${hasContact ? "（含聯絡方式）" : ""} — ${who}（${msg.channel}）`;

  // 附上前文：只有最後一句的通知信看不出客人要什麼，等於還是要自己去後台翻
  const recent = [...history.slice(-6), { role: "user" as const, content: msg.text }]
    .map((t) => `${t.role === "user" ? "客人" : "客服"}：${t.content}`)
    .join("\n");

  await notifyOwner(
    subject,
    [
      `來源：${msg.channel}`,
      `對象：${who}`,
      firstTime ? `原因：${result.handoffReason || "未說明"}` : "狀態：已轉接，這是客人後續補充",
      "",
      "─── 對話 ───",
      recent,
      `客服：${result.reply}`,
      "",
      `對話 ID：${convo.id}`,
    ].join("\n"),
  );
}
