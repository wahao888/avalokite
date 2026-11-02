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

  // 只在第一次判定要轉人時通知。不加這道，客人往下每問一句都會再寄一封。
  if (result.needsHuman && !convo.handoff) {
    await prisma.chatConversation.update({
      where: { id: convo.id },
      data: { handoff: true, handoffAt: new Date(), handoffReason: result.handoffReason },
    });
    const who = convo.displayName ?? msg.displayName ?? msg.externalId;
    await notifyOwner(
      `[Avalo] AI 客服請求轉接 — ${who}（${msg.channel}）`,
      [
        `來源：${msg.channel}`,
        `對象：${who}`,
        `原因：${result.handoffReason || "未說明"}`,
        "",
        `客人最後說：${msg.text}`,
        `AI 回覆：${result.reply}`,
        "",
        `對話 ID：${convo.id}`,
      ].join("\n"),
    );
  }

  return result.reply;
}
