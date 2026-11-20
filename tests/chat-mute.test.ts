import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * 真人接手期間 AI 要閉嘴。
 *
 * 不打真的模型：這裡要守的是「什麼時候不該回話」，不是回得好不好。
 * 回傳值固定成「需要轉人」，就能穩定地走到轉接那條路上。
 */
const mails: { subject: string; body: string }[] = [];
vi.mock("@/lib/mail", () => ({
  notifyOwner: async (subject: string, body: string) => {
    mails.push({ subject, body });
    return true;
  },
}));

let calls = 0;
let lastContext: string | undefined;
vi.mock("@/lib/ai-agent", () => ({
  HISTORY_TURNS: 10,
  answer: async (_h: unknown, _t: string, _k: string, context?: string) => {
    calls += 1;
    lastContext = context;
    return {
      reply: "好的，請留下您的稱呼與聯絡方式。",
      needsHuman: true,
      handoffReason: "客戶要求真人聯繫",
      usage: { input: 0, output: 0, cacheRead: 0 },
    };
  },
}));

const { handleMessage } = await import("@/lib/chat-service");
const { muteConversation } = await import("@/lib/chat-stats");
const { prisma } = await import("@/lib/prisma");

const ids: string[] = [];
const newId = (tag: string) => {
  const id = `mute-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  ids.push(id);
  return id;
};

afterEach(async () => {
  // 客人留電話會自動建詢問單（captureLead），一起清掉，不要在本機資料庫留下測試單
  const convos = await prisma.chatConversation.findMany({ where: { externalId: { in: ids } }, select: { id: true } });
  for (const c of convos) {
    await prisma.inquiry.deleteMany({ where: { payload: { contains: `"chatConversationId":${c.id}` } } });
  }
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  ids.length = 0;
  mails.length = 0;
  calls = 0;
  lastContext = undefined;
});

const key = (externalId: string) => ({
  tenantId_channel_externalId: { tenantId: "avalo", channel: "line", externalId },
});
const convoOf = (externalId: string) => prisma.chatConversation.findUniqueOrThrow({ where: key(externalId) });

describe("AI 判定轉專人（LINE）：通知站方，但 AI 繼續回覆", () => {
  /**
   * 2026-11-20 實測：轉接後客人再傳「幫我下單」「幫我寫詢價單」，
   * 只換到一句「請稍候」或完全沒回應。轉專人不能等於把客人晾著。
   */
  it("轉接之後客人再問，AI 照常回答，不靜音", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "我是既有客戶" });
    const c = await convoOf(externalId);
    expect(c.handoff).toBe(true);
    expect(c.mutedUntil).toBeNull();

    const before = calls;
    const r = await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "幫我寫詢價單" });
    expect(r).toBeTruthy();
    expect(calls).toBe(before + 1);
  });

  it("轉接之後模型知道已經通知過專人，不會只回「請稍候」", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "我是既有客戶" });
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "幫我下單" });
    expect(lastContext).toContain("先前已經通知專人");
    expect(lastContext).toContain("客戶要求真人聯繫");
  });

  it("轉接之後客人說的每一句仍寄信給站方，附上 AI 的回覆；留電話時主旨看得出來", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "叫真人來" });
    mails.length = 0;
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "我姓王 0912345678" });
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toContain("含聯絡方式");
    expect(mails[0].body).toContain("客服：好的");
  });

  it("第一封通知信說明 AI 會繼續回答，要親自回請先按「我自己接」", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "叫真人來" });
    expect(mails[0].body).toContain("AI 會繼續回答客人");
    expect(mails[0].body).toContain("我自己接");
  });
});

describe("站方按「我自己接」後 AI 靜音（LINE）", () => {
  it("完全不出聲、不呼叫模型，免得跟你搶話", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "叫真人來" });
    await muteConversation((await convoOf(externalId)).id);
    const before = calls;
    const r = await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "還在嗎" });
    expect(r).toBeNull();
    expect(calls).toBe(before);
  });

  it("客人說的話照樣存檔、寄信，信裡照實寫「未回覆」", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "叫真人來" });
    await muteConversation((await convoOf(externalId)).id);
    mails.length = 0;
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "我姓王 0912345678" });
    const convo = await prisma.chatConversation.findUniqueOrThrow({ where: key(externalId), include: { messages: true } });
    expect(convo.messages.map((m) => m.content)).toContain("我姓王 0912345678");
    expect(mails).toHaveLength(1);
    expect(mails[0].body).toContain("你已接手這個對話");
    expect(mails[0].body).toContain("AI 靜音中，未回覆");
  });

  it("靜音到期後自動恢復（客人隔幾天來問別的，不該沒人理）", async () => {
    const externalId = newId("line");
    await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "叫真人來" });
    await prisma.chatConversation.update({ where: key(externalId), data: { mutedUntil: new Date(Date.now() - 1000) } });
    const after = await handleMessage({ tenantId: "avalo", channel: "line", externalId, text: "請問官網多少錢" });
    expect(after).toBeTruthy();
  });
});

describe("官網聊天不靜音", () => {
  /** 官網沒有真人介面，靜音只會變成沒人理——那不是接手，是消失。 */
  it("轉人之後仍然繼續回覆", async () => {
    const externalId = newId("web");
    await handleMessage({ tenantId: "avalo", channel: "web", externalId, text: "叫真人來" });
    const second = await handleMessage({ tenantId: "avalo", channel: "web", externalId, text: "我姓王 0912345678" });
    expect(second).toBeTruthy();
  });
});
