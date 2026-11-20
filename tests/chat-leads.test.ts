import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * 加好友歡迎詞、貼圖／圖片、留電話自動建詢問單、客服連結的來源標記。
 *
 * 不打真的模型：回傳固定成「不需要轉人」，才能測到「沒有轉人、但客人留了電話」
 * 這條原本會漏掉的路。
 */
const mails: { subject: string; body: string }[] = [];
vi.mock("@/lib/mail", () => ({
  notifyOwner: async (subject: string, body: string) => {
    mails.push({ subject, body });
    return true;
  },
  notifyTenant: async (_t: unknown, opts: { subject: string; text: string }) => {
    mails.push({ subject: opts.subject, body: opts.text });
    return true;
  },
}));

vi.mock("@/lib/ai-agent", () => ({
  HISTORY_TURNS: 10,
  answer: async () => ({
    reply: "好的，方案頁在這裡：\nhttps://avalokite.xyz/services/website\n\n請問您需要幾頁？",
    needsHuman: false,
    handoffReason: "",
    quickReplies: ["五頁以內"],
    usage: { input: 0, output: 0, cacheRead: 0 },
  }),
}));

const { handleMessageDetailed, handleMedia, welcomeMessage, extractContact, withRef, captureLead } = await import(
  "@/lib/chat-service"
);
const { prisma } = await import("@/lib/prisma");

const ids: string[] = [];
const newId = (tag: string) => {
  const id = `lead-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  ids.push(id);
  return id;
};

async function convoOf(externalId: string) {
  return prisma.chatConversation.findFirstOrThrow({ where: { externalId } });
}
const leadsOf = (conversationId: number) =>
  prisma.inquiry.findMany({ where: { payload: { contains: `"chatConversationId":${conversationId}` } } });

afterEach(async () => {
  const convos = await prisma.chatConversation.findMany({ where: { externalId: { in: ids } }, select: { id: true } });
  for (const c of convos) {
    await prisma.inquiry.deleteMany({ where: { payload: { contains: `"chatConversationId":${c.id}` } } });
  }
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  ids.length = 0;
  mails.length = 0;
});

describe("加好友歡迎詞", () => {
  it("主站帶名字與三顆按鈕", () => {
    const w = welcomeMessage("avalo", "王大明");
    expect(w.text).toContain("王大明 您好");
    expect(w.quickReplies).toEqual(["看方案價格", "看作品案例", "找專人聊"]);
  });
  it("沒有名字時只說您好；客戶站用客戶的品牌名", () => {
    expect(welcomeMessage("avalo", null).text.startsWith("您好！")).toBe(true);
    expect(welcomeMessage("wenshan", null).text).toContain("文山木材行");
  });
});

describe("貼圖與圖片", () => {
  it("貼圖固定回覆、給按鈕，不轉人也不寄信", async () => {
    const externalId = newId("sticker");
    const r = await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "sticker");
    expect(r?.text).toContain("直接打字");
    expect(r?.quickReplies.length).toBeGreaterThan(0);
    expect((await convoOf(externalId)).handoff).toBe(false);
    expect(mails).toHaveLength(0);
  });
  it("圖片：寄信請站方查看，但不轉人、不靜音，對話裡記成〔圖片〕", async () => {
    const externalId = newId("image");
    const r = await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "image");
    expect(r?.text).toContain("已請同事查看");
    const c = await convoOf(externalId);
    expect(c.handoff).toBe(false);
    expect(c.mutedUntil).toBeNull();
    expect(mails[0].subject).toContain("客人傳了圖片");
    const msgs = await prisma.chatMessage.findMany({ where: { conversationId: c.id }, orderBy: { id: "asc" } });
    expect(msgs[0].content).toBe("〔圖片〕");
  });

  it("傳完截圖接著打字問問題：AI 照常回答", async () => {
    const externalId = newId("image-then-text");
    await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "image");
    const r = await handleMessageDetailed({ tenantId: "avalo", channel: "line", externalId, text: "這種網站多少錢" });
    expect(r?.text).toContain("方案頁");
  });
  it("真人接手中再傳檔案：只送一次固定確認，之後不出聲，但每次都寄信", async () => {
    const externalId = newId("muted");
    await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "sticker");
    await prisma.chatConversation.update({
      where: { id: (await convoOf(externalId)).id },
      data: { handoff: true, handoffAt: new Date(), handoffReason: "客訴", mutedUntil: new Date(Date.now() + 3_600_000) },
    });
    mails.length = 0;
    const r = await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "file");
    expect(r?.text).toContain("已為您轉給專人");
    const r2 = await handleMedia({ tenantId: "avalo", channel: "line", externalId }, "image");
    expect(r2).toBeNull();
    expect(mails).toHaveLength(2);
  });
});

describe("留電話自動建詢問單", () => {
  it("抓得出手機與 email", () => {
    expect(extractContact("我是王先生 0912-345-678，信箱 wang@example.com")).toEqual({
      phone: "0912345678",
      email: "wang@example.com",
    });
    expect(extractContact("NT$12,800 統編 12345678")).toEqual({ phone: "", email: "" });
  });

  it("沒轉人的對話留了電話：建一張單並寄信", async () => {
    const externalId = newId("lead");
    await handleMessageDetailed({ tenantId: "avalo", channel: "line", externalId, displayName: "王大明", text: "官網多少錢" });
    await handleMessageDetailed({ tenantId: "avalo", channel: "line", externalId, text: "我的電話 0912345678" });
    const c = await convoOf(externalId);
    const leads = await leadsOf(c.id);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ tenantId: null, name: "王大明", phone: "0912345678", notified: true });
    expect(leads[0].message).toContain("官網多少錢");
    expect(mails.some((m) => m.subject.includes("新詢問單"))).toBe(true);
  });

  it("同一段對話補第二個聯絡方式：補進同一張單，不另開", async () => {
    const externalId = newId("lead2");
    await handleMessageDetailed({ tenantId: "avalo", channel: "web", externalId, text: "0912345678" });
    await handleMessageDetailed({ tenantId: "avalo", channel: "web", externalId, text: "email 是 a@b.co" });
    const leads = await leadsOf((await convoOf(externalId)).id);
    expect(leads).toHaveLength(1);
    expect(leads[0].email).toBe("a@b.co");
    expect(leads[0].message).toContain("（客人補充）");
  });

  it("客戶站的單記在客戶自己的 tenantId 底下", async () => {
    // 直接建對話再呼叫 captureLead：真實客戶站要在 tenants.ts 開了 AI 客服才會走到模型那段
    const externalId = newId("tenant");
    const c = await prisma.chatConversation.create({ data: { tenantId: "wenshan", channel: "line", externalId } });
    await captureLead(c.id, { tenantId: "wenshan", channel: "line", externalId, text: "0912345678" });
    const leads = await leadsOf(c.id);
    expect(leads[0].tenantId).toBe("wenshan");
  });
});

describe("客服連結的來源標記", () => {
  it("主站網址依通道加上 ref", async () => {
    const externalId = newId("ref");
    const r = await handleMessageDetailed({ tenantId: "avalo", channel: "line", externalId, text: "官網多少錢" });
    expect(r?.text).toContain("https://avalokite.xyz/services/website?ref=line-ai");
    expect(withRef("看 https://avalokite.xyz/pricing", { tenantId: "avalo", channel: "web" })).toBe(
      "看 https://avalokite.xyz/pricing?ref=web-ai",
    );
  });
  it("已有參數用 &；客戶站與其他網域不動", () => {
    expect(withRef("https://avalokite.xyz/a?x=1", { tenantId: "avalo", channel: "line" })).toBe(
      "https://avalokite.xyz/a?x=1&ref=line-ai",
    );
    expect(withRef("https://wenshan.avalokite.xyz/", { tenantId: "avalo", channel: "line" })).toBe(
      "https://wenshan.avalokite.xyz/",
    );
    expect(withRef("https://avalokite.xyz/pricing", { tenantId: "wenshan", channel: "line" })).toBe(
      "https://avalokite.xyz/pricing",
    );
  });
});
