// 一則訊息進來到一則回覆出去的完整流程。LINE webhook 與網站聊天都走這裡。

import { prisma } from "@/lib/prisma";
import { notifyOwner, notifyTenant } from "@/lib/mail";
import { answer, HISTORY_TURNS, type AgentTurn } from "@/lib/ai-agent";
import { houseKnowledge, tenantKnowledge } from "@/lib/ai-knowledge";
import { estimateCostUsd } from "@/lib/chat-pricing";
import { dailyReplyCap, planOf } from "@/lib/ai-plans";
import { getTenant, HOUSE_TENANT } from "@/lib/tenants";
import { taipeiDateKey, taipeiDayStart, taipeiMonthStart } from "@/lib/tw-time";

export type ChatChannel = "line" | "web";

export interface IncomingMessage {
  /** "avalo" = 主站自己的客服，其餘為 tenants.ts 的 slug */
  tenantId: string;
  channel: ChatChannel;
  /** LINE userId，或網站訪客的匿名 id */
  externalId: string;
  displayName?: string | null;
  text: string;
}

/**
 * 全站每日回覆上限。
 *
 * 每則對話都會打一次外部 API，所以這不是防洗版，是防帳單。每個 IP 的限流
 * 擋得住一個人，擋不住一百台機器；nginx 的 5r/s 也只是讓攻擊變慢，不是變貴。
 * 這道是最後一關：超過就停止呼叫模型，當天後續一律回「請留聯絡方式」。
 * 寧可漏接幾個真客人，也不要隔天看到五位數的帳單。
 */
export const DAILY_CAP = Number(process.env.AI_DAILY_CAP || 500);

/**
 * 每月花費上限（美元）。這是真正對得上「我不想付超過多少錢」的那道閘。
 *
 * 每日則數上限擋的是單日爆量，但一個月慢慢灌一樣會把錢花完；反過來，
 * 單價換模型就會變，用則數估錢永遠估不準。所以兩道並存：則數擋突發，
 * 金額擋累積。
 */
export const MONTHLY_BUDGET = Number(process.env.AI_MONTHLY_BUDGET_USD || 10);

/**
 * 轉人之後 AI 閉嘴幾小時。
 *
 * 只對 LINE 生效——那裡你能在 LINE Official Account Manager 的聊天分頁親自回，
 * AI 繼續自動回每一句就是跟你在同一個對話框裡搶話。官網的聊天視窗沒有真人
 * 介面，靜音只會變成沒人理。
 *
 * 用時間自動解除而不是永久靜音：客人過幾天來問別的事，不該還是沒人回。
 */
export const MUTE_HOURS = Number(process.env.AI_MUTE_HOURS || 12);

/** 單則訊息的字數上限。LINE 一則可以送到 5000 字，全塞進去就是五千字的輸入成本。 */
const MAX_CHARS = 1000;

/** 超額時回這句。語氣不提「系統上限」——那等於告訴攻擊者他打中了。 */
const CAPPED_REPLY =
  "不好意思，目前線上客服忙線中。請留下您的稱呼與聯絡方式，或來信 service@avalokite.xyz，我們會請專人盡快與您聯繫。";

/**
 * 已經寄過超額警示的「租戶＋項目＋日期」。重啟歸零，可接受。
 *
 * 一定要把租戶放進鍵裡：共用一個旗標的話，某個客戶站今天打到上限之後，
 * 其他客戶站與主站當天再怎麼爆也不會有人收到信——而那正是最需要收到信的一天。
 */
const capAlerted = new Set<string>();

/**
 * 某個租戶本月的模型花費（台北時間的月界線）。
 *
 * 用關聯過濾而不是在 ChatMessage 上另存一份 tenantId：同一筆事實存兩個地方，
 * 遲早會有一邊沒更新。資料量到十萬則以上再考慮反正規化。
 */
export async function monthlySpendUsd(tenantId: string): Promise<number> {
  const agg = await prisma.chatMessage.aggregate({
    where: {
      role: "assistant",
      createdAt: { gte: taipeiMonthStart() },
      conversation: { tenantId },
    },
    _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true },
  });
  return estimateCostUsd({
    input: agg._sum.inputTokens ?? 0,
    output: agg._sum.outputTokens ?? 0,
    cacheRead: agg._sum.cacheReadTokens ?? 0,
  });
}

/**
 * 這個租戶的上限。主站沿用環境變數（它不是 TENANTS 的一員）；
 * 客戶站一律查方案等級，所以定價頁寫的數字跟實際擋的是同一個。
 *
 * 回 null = 這個 slug 沒有買 AI 客服。那種情況下訊息根本不該進來，
 * 代表路由或設定有錯，寧可一律不回也不要默默幫對方付錢跑模型。
 */
function limitsFor(tenantId: string) {
  if (tenantId === HOUSE_TENANT) {
    return { daily: DAILY_CAP, monthlyUsd: MONTHLY_BUDGET, label: "Avalo 主站", tenant: null };
  }
  const tenant = getTenant(tenantId);
  if (!tenant?.aiSupport) return null;
  const plan = planOf(tenant.aiSupport.plan);
  return {
    daily: dailyReplyCap(plan),
    monthlyUsd: plan.monthlyBudgetUsd,
    label: tenant.name,
    tenant,
  };
}

/** 超額警示一律寄給 Avalo：那是帳單與容量的事，不是客戶站該處理的。 */
async function alertOnce(key: string, subject: string, lines: string[]): Promise<void> {
  const stamp = key + ":" + taipeiDateKey();
  if (capAlerted.has(stamp)) return;
  capAlerted.add(stamp);
  await notifyOwner(subject, lines.join("\n"));
}

/** 回 true 代表這則不要送進模型。兩道閘任一踩到就停。 */
async function overBudget(tenantId: string): Promise<boolean> {
  const limits = limitsFor(tenantId);
  if (!limits) {
    console.warn(`[chat] ${tenantId} 沒有啟用 AI 客服，不呼叫模型`);
    return true;
  }
  const { daily: DAILY_LIMIT, monthlyUsd: MONTHLY_LIMIT, label } = limits;

  const spent = await monthlySpendUsd(tenantId);
  if (spent >= MONTHLY_LIMIT) {
    await alertOnce(
      tenantId + ":month",
      `[Avalo] ⚠️ ${label} 的 AI 客服已達每月費用上限 US$${MONTHLY_LIMIT}，本月剩餘對話改為人工`,
      [
        `本月（台北時間）已花費約 US$${spent.toFixed(2)}，達到上限 US$${MONTHLY_LIMIT}。`,
        `站別：${label}（${tenantId}）`,
        "",
        "這個數字是用資料庫裡記錄的 token 數乘單價估的，與 OpenAI 帳單會有小幅出入。",
        tenantId === HOUSE_TENANT
          ? "要放寬請改 .env 的 AI_MONTHLY_BUDGET_USD 再 restart。"
          : "要放寬就是升級方案：改 tenants.ts 的 aiSupport.plan 再部署。",
        "期間客人仍會收到請他留聯絡方式的回覆，不會沒人理。",
      ],
    );
    return true;
  }

  const used = await prisma.chatMessage.count({
    where: {
      role: "assistant",
      createdAt: { gte: taipeiDayStart() },
      conversation: { tenantId },
    },
  });
  if (used >= DAILY_LIMIT) {
    await alertOnce(
      tenantId + ":day",
      `[Avalo] ⚠️ ${label} 的 AI 客服已達每日回覆上限，當天剩餘對話改為人工`,
      [
        `今日已回覆 ${used} 則，達到上限 ${DAILY_LIMIT}（本月花費約 US$${spent.toFixed(2)}）。`,
        `站別：${label}（${tenantId}）`,
        "",
        "正常營運不會碰到這個數字，請先確認是不是有人在灌：",
        "  sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head",
        "",
        tenantId === HOUSE_TENANT
          ? "確認是真實需求的話，調高 .env 的 AI_DAILY_CAP 再 restart。"
          : "確認是真實需求的話，跟客戶談升級方案。",
      ],
    );
    return true;
  }
  return false;
}

/**
 * 這個租戶要餵給模型的知識庫。
 *
 * 主站是當場算的（調價後客服立刻改口），客戶站是存著的一份文字。
 * 兩者都放在 messages[0] 且內容穩定，prompt caching 才吃得到。
 */
async function knowledgeFor(tenantId: string): Promise<string> {
  if (tenantId === HOUSE_TENANT) return houseKnowledge();
  const row = await prisma.chatKnowledge.findUnique({ where: { tenantId } });
  return tenantKnowledge(getTenant(tenantId)?.name ?? tenantId, row?.content ?? "");
}

/** 回 null 代表「這則不要回覆」——真人已接手，AI 安靜聽著就好。 */
export async function handleMessage(msg: IncomingMessage): Promise<string | null> {
  // 先截斷再做任何事：下面每一步（存檔、帶進歷史、送進模型）都會被長度放大
  const text = msg.text.slice(0, MAX_CHARS);
  msg = { ...msg, text };

  if (await overBudget(msg.tenantId)) return CAPPED_REPLY;

  const convo = await prisma.chatConversation.upsert({
    where: {
      tenantId_channel_externalId: {
        tenantId: msg.tenantId,
        channel: msg.channel,
        externalId: msg.externalId,
      },
    },
    create: {
      tenantId: msg.tenantId,
      channel: msg.channel,
      externalId: msg.externalId,
      displayName: msg.displayName ?? null,
    },
    // 顯示名稱可能第一次沒拿到，之後補上；拿不到就別用 null 蓋掉已有的值。
    update: msg.displayName ? { displayName: msg.displayName } : {},
  });

  // 真人接手期間不呼叫模型，但訊息照存、通知照寄——客人說的每一句你都要看得到
  const muted =
    msg.channel === "line" && !!convo.mutedUntil && convo.mutedUntil > new Date();
  if (muted) {
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { conversationId: convo.id, role: "user", content: text },
      }),
      prisma.chatConversation.update({
        where: { id: convo.id },
        data: { lastAt: new Date() },
      }),
    ]);
    await notifyIfNeeded(convo, msg, null, []);
    return null;
  }

  const recent = await prisma.chatMessage.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
  });
  const history: AgentTurn[] = recent
    .reverse()
    .map((m) => ({ role: m.role as AgentTurn["role"], content: m.content }));

  const result = await answer(history, msg.text, await knowledgeFor(msg.tenantId));

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
  result: { reply: string; needsHuman: boolean; handoffReason: string } | null,
  history: AgentTurn[],
): Promise<void> {
  const firstTime = !!result?.needsHuman && !convo.handoff;
  if (!firstTime && !convo.handoff) return;

  // LINE 從下一則起靜音；官網不靜音（那裡沒有真人介面，靜了就沒人理）
  const muteUntil =
    msg.channel === "line" ? new Date(Date.now() + MUTE_HOURS * 3_600_000) : null;

  if (firstTime) {
    await prisma.chatConversation.update({
      where: { id: convo.id },
      data: {
        handoff: true,
        handoffAt: new Date(),
        handoffReason: result?.handoffReason ?? "真人接手",
        mutedUntil: muteUntil,
      },
    });
  } else if (muteUntil) {
    // 客人持續在講，就把靜音往後延：你還在處理，AI 不該中途插話
    await prisma.chatConversation.update({
      where: { id: convo.id },
      data: { mutedUntil: muteUntil },
    });
  }

  const who = convo.displayName ?? msg.displayName ?? msg.externalId;
  const hasContact = looksLikeContact(msg.text);
  const brand = msg.tenantId === HOUSE_TENANT ? "Avalo" : (getTenant(msg.tenantId)?.name ?? msg.tenantId);
  const subject = firstTime
    ? `[${brand}] AI 客服請求轉接 — ${who}（${msg.channel}）`
    : `[${brand}] 客人補充訊息${hasContact ? "（含聯絡方式）" : ""} — ${who}（${msg.channel}）`;

  const muteNote = muteUntil
    ? `AI 已在此對話靜音至 ${muteUntil.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}，` +
      "這段期間客人的訊息只會寄信給你，LINE 上不會自動回覆——請直接在 LINE 官方帳號的聊天分頁接手。"
    : "";

  // 附上前文：只有最後一句的通知信看不出客人要什麼，等於還是要自己去後台翻
  const recent = [...history.slice(-6), { role: "user" as const, content: msg.text }]
    .map((t) => `${t.role === "user" ? "客人" : "客服"}：${t.content}`)
    .join("\n");

  const body = [
      `來源：${msg.channel}`,
      `對象：${who}`,
      firstTime ? `原因：${result?.handoffReason || "未說明"}` : "狀態：已轉接，這是客人後續補充",
      ...(muteNote ? ["", muteNote] : []),
      "",
      "─── 對話 ───",
      recent,
      ...(result ? [`客服：${result.reply}`] : ["（AI 靜音中，未回覆）"]),
      "",
      `對話 ID：${convo.id}`,
  ].join("\n");

  // 寄給真正要回這個客人的人：客戶站的轉接通知進客戶自己的收件匣，
  // 全部塞給 Avalo 的話，等於我們變成每個客戶的第一線總機。
  // notifyTenant 沒設收件人時會自動退回 MAIL_OWNER，不會整封掉。
  const tenant = msg.tenantId === HOUSE_TENANT ? null : getTenant(msg.tenantId);
  if (tenant) await notifyTenant(tenant, { subject, text: body });
  else await notifyOwner(subject, body);
}
