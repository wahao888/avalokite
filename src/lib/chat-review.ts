// 每週「客服答不好的問題」報告。
//
// 知識庫缺什麼，最準的來源是客人實際問了什麼、客服哪裡接不住。
// 這支每週一把上週的對話掃一遍，挑出值得看的寄給你：看完決定要不要補進知識庫。
// 只讀不寫，跑幾次都沒有副作用。

import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";
import { getTenant, HOUSE_TENANT } from "@/lib/tenants";

export const REVIEW_DAYS = 7;

/** 一封信列太多就沒人看完；超過的只報數量，其餘到後台看。 */
const MAX_ITEMS = 15;

/**
 * 客服「接不住」時的典型說法。
 *
 * 這些字串對應接待規則裡「不確定就說不確定、請對方留聯絡方式」那條：
 * 規則要求模型這樣說，所以這樣說的地方就是知識庫沒涵蓋到的地方。
 * 改接待規則的措辭時要一起看這裡。
 */
const WEAK_PHRASES = ["不確定", "無法回答", "沒有這項資訊", "沒有相關資訊", "請留下您的稱呼", "請專人", "由專人"];

export type ReviewKind = "handoff" | "weak" | "repeat";

export interface ReviewItem {
  conversationId: number;
  tenantId: string;
  kind: ReviewKind;
  /** 客人當時問的那句 */
  question: string;
  /** 客服怎麼回（轉人時是轉人原因） */
  detail: string;
}

interface Msg {
  role: string;
  content: string;
}

const clip = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n)}…` : s).replace(/\s+/g, " ");

/** 去掉標點與空白後比對：客人重問時常常只是多了個問號或換了個語助詞。 */
const norm = (s: string) => s.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

/**
 * 從一段對話挑出值得看的地方。一段對話最多報一筆：同一個客人卡住的那一串，
 * 看第一個卡點就夠了，列三次只是灌水。
 *
 * 優先順序：轉人 > 客服說不確定 > 客人重問同一句。
 */
export function reviewConversation(
  convo: { id: number; tenantId: string; handoff: boolean; handoffReason: string | null },
  messages: Msg[],
): ReviewItem | null {
  const base = { conversationId: convo.id, tenantId: convo.tenantId };

  const firstQuestion = messages.find((m) => m.role === "user")?.content ?? "";

  if (convo.handoff) {
    // 轉人原因是模型自己寫的一句話；客人的問題取轉人前最後一句
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? firstQuestion;
    return { ...base, kind: "handoff", question: clip(lastUser), detail: clip(convo.handoffReason ?? "未說明") };
  }

  for (let i = 1; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    if (WEAK_PHRASES.some((p) => m.content.includes(p))) {
      const q = messages[i - 1]?.role === "user" ? messages[i - 1].content : firstQuestion;
      return { ...base, kind: "weak", question: clip(q), detail: clip(m.content) };
    }
  }

  const seen = new Set<string>();
  for (const m of messages) {
    if (m.role !== "user") continue;
    const k = norm(m.content);
    if (k.length < 4) continue; // 「好」「謝謝」「?」重複出現不代表沒答到
    if (seen.has(k)) return { ...base, kind: "repeat", question: clip(m.content), detail: "客人把同一個問題問了第二次" };
    seen.add(k);
  }
  return null;
}

const KIND_LABEL: Record<ReviewKind, string> = {
  handoff: "轉給專人",
  weak: "客服說不確定",
  repeat: "客人重問",
};

export function formatReview(items: ReviewItem[], totalConvos: number, origin: string): string {
  if (items.length === 0) {
    return `上週共 ${totalConvos} 段客服對話，沒有轉人、沒有答不出來、也沒有客人重問。知識庫目前夠用。`;
  }
  const shown = items.slice(0, MAX_ITEMS);
  const name = (t: string) => (t === HOUSE_TENANT ? "主站" : (getTenant(t)?.name ?? t));
  const lines = shown.map((it, i) =>
    [
      `${i + 1}.【${name(it.tenantId)}・${KIND_LABEL[it.kind]}】`,
      `   客人：${it.question}`,
      `   ${it.kind === "handoff" ? "原因" : it.kind === "weak" ? "客服" : "說明"}：${it.detail}`,
      `   ${origin}/admin/chat/${it.conversationId}`,
    ].join("\n"),
  );
  return [
    `上週共 ${totalConvos} 段客服對話，其中 ${items.length} 段值得看一下。`,
    "看到客人常問、但知識庫沒寫的事，就補進知識庫（主站改 src/lib/ai-knowledge.ts，客戶站到後台的知識庫編輯）。",
    "",
    ...lines,
    items.length > shown.length ? `\n另有 ${items.length - shown.length} 段未列出，請到 ${origin}/admin/chat 查看。` : "",
  ]
    .join("\n")
    .trim();
}

export async function runChatReview(now: Date = new Date(), send = true) {
  const since = new Date(now.getTime() - REVIEW_DAYS * 86_400_000);
  const convos = await prisma.chatConversation.findMany({
    where: { lastAt: { gte: since } },
    orderBy: { lastAt: "desc" },
    select: {
      id: true,
      tenantId: true,
      handoff: true,
      handoffAt: true,
      handoffReason: true,
      messages: {
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
    },
  });

  const items = convos
    // 轉人是上週以前的事、這週只是客人回來聊別的，不算這週的問題
    .map((c) => reviewConversation({ ...c, handoff: c.handoff && !!c.handoffAt && c.handoffAt >= since }, c.messages))
    .filter((x): x is ReviewItem => x !== null);

  const origin = "https://avalokite.xyz";
  const text = formatReview(items, convos.length, origin);
  const subject = `[Avalo] AI 客服週報：${items.length ? `${items.length} 段對話值得看` : "本週沒有卡住的對話"}`;
  if (send) await notifyOwner(subject, text);
  return { conversations: convos.length, items, subject, text };
}
