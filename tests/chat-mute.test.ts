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
vi.mock("@/lib/ai-agent", () => ({
  HISTORY_TURNS: 10,
  answer: async () => {
    calls += 1;
    return {
      reply: "好的，請留下您的稱呼與聯絡方式。",
      needsHuman: true,
      handoffReason: "客戶要求真人聯繫",
      usage: { input: 0, output: 0, cacheRead: 0 },
    };
  },
}));

const { handleMessage } = await import("@/lib/chat-service");
const { prisma } = await import("@/lib/prisma");

const ids: string[] = [];
const newId = (tag: string) => {
  const id = `mute-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  ids.push(id);
  return id;
};

afterEach(async () => {
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  ids.length = 0;
  mails.length = 0;
  calls = 0;
});

describe("真人接手後 AI 靜音（LINE）", () => {
  it("第一句仍會回，之後就不再回話", async () => {
    const externalId = newId("line");
    const first = await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    expect(first).toBeTruthy();

    const second = await handleMessage({ channel: "line", externalId, text: "我姓王 0912345678" });
    expect(second).toBeNull();
  });

  it("靜音期間不呼叫模型（省下來的就是錢）", async () => {
    const externalId = newId("line");
    await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    const before = calls;
    await handleMessage({ channel: "line", externalId, text: "還在嗎" });
    expect(calls).toBe(before);
  });

  it("靜音期間客人說的話照樣存進對話紀錄", async () => {
    const externalId = newId("line");
    await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    await handleMessage({ channel: "line", externalId, text: "我姓王 0912345678" });

    const convo = await prisma.chatConversation.findUniqueOrThrow({
      where: { channel_externalId: { channel: "line", externalId } },
      include: { messages: true },
    });
    expect(convo.messages.map((m) => m.content)).toContain("我姓王 0912345678");
  });

  it("靜音期間仍然寄信，主旨看得出有聯絡方式", async () => {
    const externalId = newId("line");
    await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    mails.length = 0;
    await handleMessage({ channel: "line", externalId, text: "我姓王 0912345678" });

    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toContain("含聯絡方式");
    expect(mails[0].body).toContain("AI 靜音中，未回覆");
  });

  it("通知信告訴你靜音到什麼時候、要去哪裡接手", async () => {
    const externalId = newId("line");
    await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    expect(mails[0].body).toContain("AI 已在此對話靜音至");
    expect(mails[0].body).toContain("聊天分頁");
  });

  it("靜音到期後自動恢復（客人隔幾天來問別的，不該沒人理）", async () => {
    const externalId = newId("line");
    await handleMessage({ channel: "line", externalId, text: "叫真人來" });
    await prisma.chatConversation.update({
      where: { channel_externalId: { channel: "line", externalId } },
      data: { mutedUntil: new Date(Date.now() - 1000) },
    });
    const after = await handleMessage({ channel: "line", externalId, text: "請問官網多少錢" });
    expect(after).toBeTruthy();
  });
});

describe("官網聊天不靜音", () => {
  /** 官網沒有真人介面，靜音只會變成沒人理——那不是接手，是消失。 */
  it("轉人之後仍然繼續回覆", async () => {
    const externalId = newId("web");
    await handleMessage({ channel: "web", externalId, text: "叫真人來" });
    const second = await handleMessage({ channel: "web", externalId, text: "我姓王 0912345678" });
    expect(second).toBeTruthy();
  });
});
