import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * AI 客服的租戶隔離。
 *
 * 這一整檔守的是「賣給第二個客戶之後不會出事」：對話不會串台、某個客戶的
 * 機器人灌爆不會把別人的客服關掉、轉人通知不會寄錯人、客服不會自稱錯品牌。
 * 這些錯都不會讓程式崩潰，只會安靜地發生在客人面前。
 */

const FAKE_TENANTS = [
  {
    slug: "alpha",
    name: "Alpha 測試行號",
    indexable: false,
    paths: ["/"],
    notifyEnv: "TENANT_NOTIFY_ALPHA",
    aiSupport: { plan: "lite" as const, lineSecretEnv: "ALPHA_SECRET", lineTokenEnv: "ALPHA_TOKEN" },
  },
  {
    slug: "beta",
    name: "Beta 測試行號",
    indexable: false,
    paths: ["/"],
    notifyEnv: "TENANT_NOTIFY_BETA",
    aiSupport: { plan: "business" as const },
  },
  // 沒買 AI 客服的客戶站
  { slug: "gamma", name: "Gamma 測試行號", indexable: false, paths: ["/"], notifyEnv: "TENANT_NOTIFY_GAMMA" },
];

vi.mock("@/lib/tenants", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tenants")>();
  return {
    ...real,
    TENANTS: FAKE_TENANTS,
    getTenant: (slug: string | null | undefined) =>
      FAKE_TENANTS.find((t) => t.slug === slug) ?? null,
  };
});

const ownerMails: { subject: string; body: string }[] = [];
const tenantMails: { slug: string; subject: string; body: string }[] = [];
vi.mock("@/lib/mail", () => ({
  notifyOwner: async (subject: string, body: string) => {
    ownerMails.push({ subject, body });
    return true;
  },
  notifyTenant: async (t: { slug: string }, opts: { subject: string; text: string }) => {
    tenantMails.push({ slug: t.slug, subject: opts.subject, body: opts.text });
    return true;
  },
}));

let modelCalls: string[] = [];
vi.mock("@/lib/ai-agent", () => ({
  HISTORY_TURNS: 10,
  answer: async (_h: unknown, _t: string, knowledge: string) => {
    modelCalls.push(knowledge);
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
const { tenantKnowledge } = await import("@/lib/ai-knowledge");
const { verifyLineSignature, tenantCreds } = await import("@/lib/line");
const { dailyReplyCap, AI_PLANS } = await import("@/lib/ai-plans");

const ids: string[] = [];
const newId = (tag: string) => {
  const id = `tn-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  ids.push(id);
  return id;
};

afterEach(async () => {
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  await prisma.chatKnowledge.deleteMany({ where: { tenantId: { in: ["alpha", "beta"] } } });
  ids.length = 0;
  ownerMails.length = 0;
  tenantMails.length = 0;
  modelCalls = [];
});

describe("對話不會串台", () => {
  it("同一個 LINE userId 在兩個客戶站是兩段對話", async () => {
    const externalId = newId("shared");
    await handleMessage({ tenantId: "alpha", channel: "line", externalId, text: "你好" });
    await handleMessage({ tenantId: "beta", channel: "line", externalId, text: "你好" });

    const rows = await prisma.chatConversation.findMany({ where: { externalId } });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.tenantId).sort()).toEqual(["alpha", "beta"]);
  });

  it("同一個站的同一個人仍然只有一段對話", async () => {
    const externalId = newId("same");
    await handleMessage({ tenantId: "alpha", channel: "line", externalId, text: "一" });
    await handleMessage({ tenantId: "alpha", channel: "line", externalId, text: "二" });

    const rows = await prisma.chatConversation.findMany({ where: { externalId } });
    expect(rows).toHaveLength(1);
  });

  it("主站與客戶站也分得開", async () => {
    const externalId = newId("house");
    await handleMessage({ tenantId: "avalo", channel: "web", externalId, text: "你好" });
    await handleMessage({ tenantId: "alpha", channel: "web", externalId, text: "你好" });
    const rows = await prisma.chatConversation.findMany({ where: { externalId } });
    expect(rows.map((r) => r.tenantId).sort()).toEqual(["alpha", "avalo"]);
  });
});

describe("沒買 AI 客服的站", () => {
  it("不呼叫模型，也不留下對話", async () => {
    const externalId = newId("gamma");
    const reply = await handleMessage({
      tenantId: "gamma",
      channel: "line",
      externalId,
      text: "你好",
    });
    // 仍然回一句話給客人（不能已讀不回），但那句是固定的，沒有進模型
    expect(reply).toBeTruthy();
    expect(modelCalls).toHaveLength(0);
    expect(await prisma.chatConversation.count({ where: { externalId } })).toBe(0);
  });

  it("不存在的 slug 同樣不呼叫模型（路由寫錯時不要幫忙付錢）", async () => {
    await handleMessage({ tenantId: "does-not-exist", channel: "line", externalId: newId("x"), text: "hi" });
    expect(modelCalls).toHaveLength(0);
  });
});

describe("知識庫是各站自己的", () => {
  it("客戶站用存著的那份，而且客服自稱客戶的品牌", async () => {
    await prisma.chatKnowledge.create({
      data: { tenantId: "alpha", content: "【營業時間】週一到週五 9:00–18:00。" },
    });
    await handleMessage({ tenantId: "alpha", channel: "web", externalId: newId("kb"), text: "幾點開門" });

    expect(modelCalls).toHaveLength(1);
    expect(modelCalls[0]).toContain("週一到週五 9:00–18:00");
    expect(modelCalls[0]).toContain("你是 Alpha 測試行號 的線上客服");
    // 絕不能把 Avalo 的價目表餵給客戶站的客人
    expect(modelCalls[0]).not.toContain("ai-chatbot");
  });

  it("知識庫還沒建就明講不確定，不要讓模型自由發揮", () => {
    const kb = tenantKnowledge("某某公司", "");
    expect(kb).toContain("還沒有內容");
    expect(kb).toContain("留下聯絡方式");
  });

  it("主站的知識庫仍然是從價目表當場算出來的", async () => {
    await handleMessage({ tenantId: "avalo", channel: "web", externalId: newId("house-kb"), text: "多少錢" });
    expect(modelCalls[0]).toContain("ai-chatbot");
    expect(modelCalls[0]).toContain("Avalo");
  });
});

describe("通知寄給對的人", () => {
  it("客戶站的轉接通知進客戶的收件匣，不是 Avalo 的", async () => {
    await handleMessage({ tenantId: "alpha", channel: "line", externalId: newId("mail"), text: "找真人" });
    expect(tenantMails.map((m) => m.slug)).toEqual(["alpha"]);
    expect(tenantMails[0].subject).toContain("Alpha 測試行號");
    expect(ownerMails).toHaveLength(0);
  });

  it("主站的轉接通知還是寄給 Avalo", async () => {
    await handleMessage({ tenantId: "avalo", channel: "line", externalId: newId("mail2"), text: "找真人" });
    expect(ownerMails).toHaveLength(1);
    expect(tenantMails).toHaveLength(0);
  });
});

describe("方案上限", () => {
  it("每日上限由方案推算，不是全站一個數字", () => {
    expect(dailyReplyCap(AI_PLANS.lite)).toBeLessThan(dailyReplyCap(AI_PLANS.business));
    expect(dailyReplyCap(AI_PLANS.business)).toBeLessThan(dailyReplyCap(AI_PLANS.enterprise));
  });

  it("每日上限要高於平均日流量，否則正常的尖峰日就會把客服關掉", () => {
    for (const plan of Object.values(AI_PLANS)) {
      const averageDailyReplies = (plan.monthlyConversations * 3) / 30;
      expect(dailyReplyCap(plan)).toBeGreaterThan(averageDailyReplies * 2);
    }
  });

  it("月費用上限要撐得住方案寫的對話量（實測每則約 US$0.000116）", () => {
    for (const plan of Object.values(AI_PLANS)) {
      const expected = plan.monthlyConversations * 3 * 0.000116;
      expect(plan.monthlyBudgetUsd, `${plan.tier} 的預算擋在實際用量之前`).toBeGreaterThan(expected);
    }
  });
});

describe("LINE 簽章用各站自己的密鑰", () => {
  it("用 A 站密鑰簽的請求，不能通過 B 站的驗證", async () => {
    process.env.ALPHA_SECRET = "alpha-secret";
    const body = JSON.stringify({ events: [] });
    const crypto = await import("node:crypto");
    const sign = (secret: string) =>
      crypto.createHmac("sha256", secret).update(body).digest("base64");

    const alpha = tenantCreds(FAKE_TENANTS[0]);
    expect(verifyLineSignature(body, sign("alpha-secret"), alpha)).toBe(true);
    expect(verifyLineSignature(body, sign("someone-elses-secret"), alpha)).toBe(false);
  });

  it("沒設定密鑰時一律不通過，不會退回主站那組", () => {
    const beta = tenantCreds(FAKE_TENANTS[1]); // 沒有 lineSecretEnv
    expect(verifyLineSignature("{}", "whatever", beta)).toBe(false);
  });
});
