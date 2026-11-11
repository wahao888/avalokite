// AI 客服後台要的那幾個數字：對話列表、月用量報表、接手／靜音的狀態切換。
//
// 查詢放在這裡而不是寫在頁面裡，是為了能被測試直接呼叫——報表算錯是看不出來的，
// 它永遠會給你一個長得很合理的數字。

import { prisma } from "@/lib/prisma";
import { estimateCostUsd, USD_TO_TWD } from "@/lib/chat-pricing";
import { MUTE_HOURS } from "@/lib/chat-service";
import { taipeiMonthKey, taipeiMonthStart } from "@/lib/tw-time";

/** 報表往回看幾個月。再久的資料意義不大，而且每個月要跑三個查詢。 */
export const REPORT_MONTHS = 6;

/**
 * 對話紀錄保留幾天。
 *
 * 隱私權政策寫的是「保留兩年」，所以這不是效能設定，是對外的承諾：
 * 沒有東西真的去刪，那句話就是假的。清理由 /api/cron/retention 每天執行，
 * 每日稽核會檢查有沒有逾期還留著的資料。
 */
export const CHAT_RETENTION_DAYS = Number(process.env.CHAT_RETENTION_DAYS || 730);

/** webhook 去重紀錄留幾天。只為了擋重送，不需要長期保存。 */
export const WEBHOOK_RETENTION_DAYS = Number(process.env.WEBHOOK_RETENTION_DAYS || 7);

export interface MonthUsage {
  /** YYYY-MM（台北時間） */
  month: string;
  /** 這個月有來過訊息的對話數（跨月的對話會在每個月都算一次） */
  conversations: number;
  /** 客人送進來的訊息數 */
  inbound: number;
  /** AI 回出去的則數。LINE 的 reply 不計費，所以這個數字對應的是模型費用 */
  replies: number;
  /** 判定要轉人的次數 */
  handoffs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** 以 chat-pricing 的單價估算的美元 */
  costUsd: number;
}

/**
 * 近 N 個月的用量。
 *
 * 一個月一組查詢而不是一次 group by：SQLite 沒有可攜的「按月分組」寫法，
 * 要嘛用 strftime 綁死方言，要嘛把整張表撈回來自己分。資料量是幾千筆的量級，
 * 多跑幾個 count 比引入任何一種都便宜。
 */
export async function monthlyUsage(
  months = REPORT_MONTHS,
  tenantId?: string,
): Promise<MonthUsage[]> {
  const now = new Date();
  const out: MonthUsage[] = [];
  // 不給 tenantId＝全站（Avalo 後台要看的是總量）；
  // 給了就是那一個客戶的報表，也就是方案裡承諾的「每月對話用量報表」。
  const scope = tenantId ? { conversation: { tenantId } } : {};
  const convoScope = tenantId ? { tenantId } : {};

  for (let i = 0; i < months; i += 1) {
    const gte = taipeiMonthStart(i, now);
    const lt = taipeiMonthStart(i - 1, now);
    const range = { gte, lt };

    const [assistant, inbound, convos, handoffs] = await Promise.all([
      prisma.chatMessage.aggregate({
        where: { role: "assistant", createdAt: range, ...scope },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true },
      }),
      prisma.chatMessage.count({ where: { role: "user", createdAt: range, ...scope } }),
      prisma.chatMessage.groupBy({
        by: ["conversationId"],
        where: { createdAt: range, ...scope },
      }),
      prisma.chatConversation.count({ where: { handoffAt: range, ...convoScope } }),
    ]);

    const tokens = {
      input: assistant._sum.inputTokens ?? 0,
      output: assistant._sum.outputTokens ?? 0,
      cacheRead: assistant._sum.cacheReadTokens ?? 0,
    };

    out.push({
      month: taipeiMonthKey(gte),
      conversations: convos.length,
      inbound,
      replies: assistant._count,
      handoffs,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
      cacheReadTokens: tokens.cacheRead,
      costUsd: estimateCostUsd(tokens),
    });
  }

  return out;
}

/** 快取命中率。這是帳單上最有感的一個數字，掉下來就代表知識庫前綴被改動了。 */
export function cacheHitRate(m: MonthUsage): number {
  if (m.inputTokens === 0) return 0;
  return Math.min(1, m.cacheReadTokens / m.inputTokens);
}

/**
 * 費用的顯示字串。
 *
 * 剛上線時一個月的模型成本是幾毛美金，固定兩位小數會一律印成 US$0.00——
 * 報表上每一格都是零，等於沒有報表。小額就多給兩位，看得出量級在哪。
 */
export function money(usd: number): { usd: string; twd: string } {
  const ntd = usd * USD_TO_TWD;
  return {
    usd: `US$${usd >= 1 ? usd.toFixed(2) : usd.toFixed(4)}`,
    twd: `NT$${ntd >= 1 ? Math.round(ntd).toLocaleString() : ntd.toFixed(2)}`,
  };
}

export interface ConversationSummary {
  id: number;
  /** 哪一個站的對話。"avalo" = 主站自己 */
  tenantId: string;
  channel: string;
  externalId: string;
  displayName: string | null;
  handoff: boolean;
  handoffAt: Date | null;
  handoffReason: string | null;
  mutedUntil: Date | null;
  lastAt: Date;
  createdAt: Date;
  messageCount: number;
  /** 最後一則的內容與角色，列表上要看得出「現在球在誰手上」 */
  lastRole: string | null;
  lastContent: string | null;
}

/** 對話列表，最近有動靜的排前面。 */
export async function recentConversations(limit = 200): Promise<ConversationSummary[]> {
  const rows = await prisma.chatConversation.findMany({
    orderBy: { lastAt: "desc" },
    take: limit,
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    tenantId: c.tenantId,
    channel: c.channel,
    externalId: c.externalId,
    displayName: c.displayName,
    handoff: c.handoff,
    handoffAt: c.handoffAt,
    handoffReason: c.handoffReason,
    mutedUntil: c.mutedUntil,
    lastAt: c.lastAt,
    createdAt: c.createdAt,
    messageCount: c._count.messages,
    lastRole: c.messages[0]?.role ?? null,
    lastContent: c.messages[0]?.content ?? null,
  }));
}

/** 單一對話的完整逐字稿，含每則 AI 回覆的 token 數。 */
export async function conversationDetail(id: number) {
  const convo = await prisma.chatConversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!convo) return null;

  const tokens = convo.messages.reduce(
    (acc, m) => ({
      input: acc.input + m.inputTokens,
      output: acc.output + m.outputTokens,
      cacheRead: acc.cacheRead + m.cacheReadTokens,
    }),
    { input: 0, output: 0, cacheRead: 0 },
  );

  return { ...convo, tokens, costUsd: estimateCostUsd(tokens) };
}

/**
 * 「我處理完了，AI 接回。」
 *
 * handoff 清掉、靜音解除，但 handoffAt 與 handoffReason 留著當紀錄——
 * 報表要數得出這個月轉了幾次人，清掉就數不到了。
 *
 * 清掉 handoff 還有一個副作用是想要的：轉接後客人每說一句都會寄信給你，
 * 標記已處理之後就停。真的又需要人時 AI 會重新判定，那時你會再收到第一封。
 */
export async function resolveHandoff(id: number): Promise<void> {
  await prisma.chatConversation.update({
    where: { id },
    data: { handoff: false, mutedUntil: null },
  });
}

/**
 * 「這個對話我自己接。」
 *
 * 用在 AI 沒判定要轉人、但你想親自回的時候：按下去之後 LINE 上的這個對話
 * 不會再有自動回覆，客人說的每一句照樣寄信給你。
 *
 * 官網的對話按了也只會停在資料上——handleMessage 只對 LINE 認靜音，
 * 因為官網的聊天視窗沒有真人介面，靜音等於沒人理。頁面上因此不給這顆按鈕。
 */
export async function muteConversation(id: number, hours = MUTE_HOURS): Promise<void> {
  const convo = await prisma.chatConversation.findUnique({ where: { id } });
  if (!convo) return;
  await prisma.chatConversation.update({
    where: { id },
    data: {
      handoff: true,
      handoffAt: convo.handoffAt ?? new Date(),
      handoffReason: convo.handoffReason ?? "站方手動接手",
      mutedUntil: new Date(Date.now() + hours * 3_600_000),
    },
  });
}

/**
 * 清掉超過保留期的對話與 webhook 去重紀錄。
 *
 * 分兩步刪：先刪逾期的訊息，再刪「已經沒有任何訊息、而且本身也夠舊」的對話。
 * 不直接以 lastAt 刪整串，是因為一通今天還在講的對話裡可能夾著兩年前的訊息——
 * 那幾則逾期了，整通對話沒有。
 */
export async function purgeExpiredChat(now: Date = new Date()): Promise<{
  messages: number;
  conversations: number;
  webhookEvents: number;
}> {
  const msgCutoff = new Date(now.getTime() - CHAT_RETENTION_DAYS * 86_400_000);
  const hookCutoff = new Date(now.getTime() - WEBHOOK_RETENTION_DAYS * 86_400_000);

  const messages = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: msgCutoff } },
  });
  const conversations = await prisma.chatConversation.deleteMany({
    where: { lastAt: { lt: msgCutoff }, messages: { none: {} } },
  });
  const webhookEvents = await prisma.lineWebhookEvent.deleteMany({
    where: { createdAt: { lt: hookCutoff } },
  });

  return {
    messages: messages.count,
    conversations: conversations.count,
    webhookEvents: webhookEvents.count,
  };
}

/** 讀某個客戶站的知識庫原文（後台編輯用）。 */
export async function getKnowledge(tenantId: string): Promise<string> {
  const row = await prisma.chatKnowledge.findUnique({ where: { tenantId } });
  return row?.content ?? "";
}

/**
 * 存客戶站的知識庫。
 *
 * 內容會原封不動變成模型的 system prompt，所以這裡是整套系統裡最該小心的
 * 輸入之一——但它只來自後台（isAdmin 之後），不是客人送的。真正要防的是
 * 手滑清空：存成空字串時，AI 會變成什麼都不知道卻還在回話，所以
 * tenantKnowledge() 對空內容有自己的保底說法。
 */
export async function saveKnowledge(tenantId: string, content: string): Promise<void> {
  const text = content.trim().slice(0, 200_000);
  await prisma.chatKnowledge.upsert({
    where: { tenantId },
    create: { tenantId, content: text },
    update: { content: text },
  });
}
