import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * LINE 客服的防呆：AI 服務故障、同一位客人連傳多句。
 */
const mails: { subject: string; body: string }[] = [];
vi.mock("@/lib/mail", () => ({
  notifyOwner: async (subject: string, body: string) => {
    mails.push({ subject, body });
    return true;
  },
  notifyTenant: async () => true,
}));

// 模擬 API 掛掉時 ai-agent 回的備用答案
vi.mock("@/lib/ai-agent", () => ({
  HISTORY_TURNS: 10,
  answer: async () => ({
    reply: "不好意思，系統剛才有點狀況。",
    needsHuman: false,
    handoffReason: "AI 回覆失敗",
    quickReplies: [],
    failed: true,
    usage: { input: 0, output: 0, cacheRead: 0 },
  }),
}));

const { handleMessageDetailed } = await import("@/lib/chat-service");
const { inOrder } = await import("@/lib/line-webhook");
const { prisma } = await import("@/lib/prisma");

const ids: string[] = [];
afterEach(async () => {
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  ids.length = 0;
  mails.length = 0;
});

describe("AI 服務故障", () => {
  it("客人收到備用回覆；對話不轉人、不靜音；站方收到提醒", async () => {
    const externalId = `hard-fail-${Date.now()}`;
    ids.push(externalId);
    const r = await handleMessageDetailed({ tenantId: "avalo", channel: "line", externalId, text: "官網多少錢" });
    expect(r?.text).toContain("系統剛才有點狀況");
    const c = await prisma.chatConversation.findFirstOrThrow({ where: { externalId } });
    expect(c.handoff).toBe(false);
    expect(c.mutedUntil).toBeNull();
    expect(mails[0].subject).toContain("AI 客服回覆失敗");
  });
});

describe("同一位客人的訊息依序處理", () => {
  it("後到的那則等前一則做完才開始", async () => {
    const log: string[] = [];
    const slow = () => new Promise<void>((r) => setTimeout(r, 30));
    await Promise.all([
      inOrder("t:u1", async () => { log.push("a-start"); await slow(); log.push("a-end"); }),
      inOrder("t:u1", async () => { log.push("b-start"); log.push("b-end"); }),
    ]);
    expect(log).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });
  it("前一則失敗不會卡住後面的", async () => {
    const log: string[] = [];
    await Promise.allSettled([
      inOrder("t:u2", async () => { throw new Error("boom"); }),
      inOrder("t:u2", async () => { log.push("b"); }),
    ]);
    expect(log).toEqual(["b"]);
  });
  it("不同客人互不等待", async () => {
    const log: string[] = [];
    let release!: () => void;
    const blocked = new Promise<void>((r) => (release = r));
    const a = inOrder("t:u3", () => blocked);
    await inOrder("t:u4", async () => { log.push("other"); });
    expect(log).toEqual(["other"]);
    release();
    await a;
  });
});
