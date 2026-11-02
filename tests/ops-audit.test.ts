import { describe, it, expect, afterEach } from "vitest";
import { auditTsv, runOpsAudit, type OpsCheck } from "@/lib/ops-audit";
import { purgeExpiredChat, CHAT_RETENTION_DAYS, WEBHOOK_RETENTION_DAYS } from "@/lib/chat-stats";
import { prisma } from "@/lib/prisma";

// 每日稽核跑在正式資料上，所以這裡不假設「乾淨的資料庫」：
// 斷言一律用「塞一筆之後至少要變成這個嚴重度」，因為既有資料只會讓嚴重度更高。

const DAY = 86_400_000;
const inquiryIds: number[] = [];
const convoIds: string[] = [];

afterEach(async () => {
  if (inquiryIds.length) {
    await prisma.inquiry.deleteMany({ where: { id: { in: inquiryIds } } });
    inquiryIds.length = 0;
  }
  if (convoIds.length) {
    await prisma.chatConversation.deleteMany({ where: { externalId: { in: convoIds } } });
    convoIds.length = 0;
  }
});

const pick = (checks: OpsCheck[], id: string) => {
  const c = checks.find((x) => x.id === id);
  expect(c, `稽核少了 ${id} 這一項`).toBeDefined();
  return c!;
};

async function newInquiry(ageDays: number) {
  const row = await prisma.inquiry.create({
    data: {
      name: "稽核測試",
      email: "audit@example.com",
      message: "測試用",
      handled: false,
      createdAt: new Date(Date.now() - ageDays * DAY),
    },
  });
  inquiryIds.push(row.id);
  return row;
}

type ConvoSeed = Omit<
  Parameters<typeof prisma.chatConversation.create>[0]["data"],
  "externalId"
>;

async function newConversation(data: ConvoSeed) {
  const externalId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  convoIds.push(externalId);
  return prisma.chatConversation.create({ data: { ...data, externalId } });
}

describe("稽核結果的形狀", () => {
  it("每一項都有代號、說明、數值與下一步", async () => {
    const checks = await runOpsAudit();
    expect(checks.length).toBeGreaterThanOrEqual(8);
    for (const c of checks) {
      expect(c.id, JSON.stringify(c)).toMatch(/^[a-z0-9-]+$/);
      expect(c.label.length, c.id).toBeGreaterThan(0);
      expect(c.value.length, c.id).toBeGreaterThan(0);
      // level 0 也要寫「為什麼不用動」，不然簡報上會出現一排空白
      expect(c.action.length, c.id).toBeGreaterThan(0);
      expect([0, 1, 2], c.id).toContain(c.level);
    }
  });

  it("代號不重複（重複的話簡報會蓋掉其中一項）", async () => {
    const ids = (await runOpsAudit()).map((c) => c.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("涵蓋客服、金流、檔期這幾類", async () => {
    const ids = (await runOpsAudit()).map((c) => c.id);
    for (const id of [
      "inquiry-open",
      "chat-handoff",
      "ai-budget",
      "line-webhook",
      "chat-retention",
      "sub-unauthorized",
      "sub-pastdue",
      "promo-window",
    ]) {
      expect(ids).toContain(id);
    }
  });
});

describe("轉成簡報吃的 TSV", () => {
  it("一行六欄，第一欄固定是 audit", () => {
    const line = auditTsv([
      { id: "x", label: "標題", value: "值", level: 1, action: "做這個" },
    ]).split("\n")[0];
    expect(line.split("\t")).toEqual(["audit", "1", "x", "標題", "值", "做這個"]);
  });

  it("值裡的 tab 與換行要清掉，不然欄位會錯位", () => {
    const line = auditTsv([
      { id: "x", label: "標\ta", value: "第一行\n第二行", level: 0, action: "好" },
    ]);
    expect(line.split("\n")).toHaveLength(1);
    expect(line.split("\t")).toHaveLength(6);
  });

  it("每一筆各自一行", async () => {
    const checks = await runOpsAudit();
    expect(auditTsv(checks).split("\n")).toHaveLength(checks.length);
  });
});

describe("詢問單", () => {
  it("放了三天以上沒回就是今天要處理", async () => {
    await newInquiry(4);
    const c = pick(await runOpsAudit(), "inquiry-open");
    expect(c.level).toBe(2);
    expect(c.value).toContain("Avalo 主站");
  });

  it("剛進來的只是留意", async () => {
    await newInquiry(0);
    const c = pick(await runOpsAudit(), "inquiry-open");
    expect(c.level).toBeGreaterThanOrEqual(1);
  });
});

describe("AI 客服", () => {
  it("轉接超過一天沒回＝客人留了電話在等，升到今天要處理", async () => {
    await newConversation({
      channel: "line",
      handoff: true,
      handoffAt: new Date(Date.now() - 25 * 3_600_000),
      handoffReason: "客戶要求真人聯繫",
    });
    expect(pick(await runOpsAudit(), "chat-handoff").level).toBe(2);
  });

  it("剛轉接的只是留意", async () => {
    await newConversation({
      channel: "line",
      handoff: true,
      handoffAt: new Date(),
      handoffReason: "詢價客製",
    });
    expect(pick(await runOpsAudit(), "chat-handoff").level).toBeGreaterThanOrEqual(1);
  });

  it("花費那一項會把上限一起寫出來，不只寫花了多少", async () => {
    const c = pick(await runOpsAudit(), "ai-budget");
    expect(c.value).toMatch(/US\$[\d.]+ \/ 上限 US\$\d/);
  });

  it("近七天都沒有 webhook 事件時不報警（那只是還沒人用）", async () => {
    const c = pick(await runOpsAudit(), "line-webhook");
    // 有事件時可能是 0 或 1，沒事件時必須是 0
    if (c.value.startsWith("昨天 0 件 / 近七天 0 件")) expect(c.level).toBe(0);
  });
});

describe("對話紀錄保留期", () => {
  it("刪掉超過保留期的訊息，近期的留著", async () => {
    const convo = await newConversation({ channel: "web" });
    await prisma.chatMessage.createMany({
      data: [
        {
          conversationId: convo.id,
          role: "user",
          content: "兩年多前說的話",
          createdAt: new Date(Date.now() - (CHAT_RETENTION_DAYS + 5) * DAY),
        },
        { conversationId: convo.id, role: "user", content: "今天說的話" },
      ],
    });

    const removed = await purgeExpiredChat();
    expect(removed.messages).toBeGreaterThanOrEqual(1);

    const left = await prisma.chatMessage.findMany({ where: { conversationId: convo.id } });
    expect(left.map((m) => m.content)).toEqual(["今天說的話"]);
  });

  it("訊息清光、本身也夠舊的對話才會一起刪掉", async () => {
    const old = await newConversation({
      channel: "web",
      lastAt: new Date(Date.now() - (CHAT_RETENTION_DAYS + 5) * DAY),
    });
    const recent = await newConversation({ channel: "web" });

    await purgeExpiredChat();

    expect(await prisma.chatConversation.findUnique({ where: { id: old.id } })).toBeNull();
    // 沒有訊息但最近才建立的對話還在進行中，不能刪
    expect(await prisma.chatConversation.findUnique({ where: { id: recent.id } })).not.toBeNull();
  });

  it("webhook 去重紀錄只留幾天", async () => {
    const id = `audit-hook-${Date.now()}`;
    await prisma.lineWebhookEvent.create({
      data: { eventId: id, createdAt: new Date(Date.now() - (WEBHOOK_RETENTION_DAYS + 1) * DAY) },
    });
    await purgeExpiredChat();
    expect(await prisma.lineWebhookEvent.findUnique({ where: { eventId: id } })).toBeNull();
  });

  it("清完之後稽核的逾期筆數歸零", async () => {
    await purgeExpiredChat();
    expect(pick(await runOpsAudit(), "chat-retention").level).toBe(0);
  });
});

describe("限時檔期", () => {
  it("會把剩幾天與剩幾席寫清楚，過期就是今天要處理", async () => {
    const c = pick(await runOpsAudit(), "promo-window");
    if (c.value.includes("已於")) expect(c.level).toBe(2);
    else expect(c.value).toMatch(/剩 -?\d+ 天、\d+\/\d+ 席/);
    // 檔期一過，外面的短影音與貼文還在跑，網站卻已經不顯示優惠了，
    // 所以要處理的時候下一步得寫清楚「去改哪一個檔案」
    if (c.level > 0) expect(c.action).toContain("promo-window.ts");
  });
});
