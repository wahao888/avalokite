import { describe, it, expect, afterEach } from "vitest";
import {
  estimateCostUsd,
  PRICE_IN,
  PRICE_CACHED,
  PRICE_OUT,
} from "@/lib/chat-pricing";
import { taipeiMonthKey, taipeiMonthStart, taipeiDayStart } from "@/lib/tw-time";
import {
  cacheHitRate,
  conversationDetail,
  monthlyUsage,
  muteConversation,
  recentConversations,
  resolveHandoff,
} from "@/lib/chat-stats";
import { prisma } from "@/lib/prisma";

describe("token 換算成錢", () => {
  it("快取命中的部分用快取單價，不重複算一次全額", () => {
    const got = estimateCostUsd({ input: 1_000_000, output: 0, cacheRead: 900_000 });
    const want = (100_000 * PRICE_IN + 900_000 * PRICE_CACHED) / 1_000_000;
    expect(got).toBeCloseTo(want, 10);
    // 沒扣掉快取的話會貴上一個量級——這正是當初要把單價收在一處的原因
    expect(got).toBeLessThan(PRICE_IN * 0.5);
  });

  it("輸出 token 用輸出單價", () => {
    expect(estimateCostUsd({ input: 0, output: 1_000_000, cacheRead: 0 })).toBeCloseTo(
      PRICE_OUT,
      10,
    );
  });

  it("cacheRead 大於 input 也不會算出負數的費用", () => {
    const got = estimateCostUsd({ input: 100, output: 0, cacheRead: 999_999 });
    expect(got).toBeGreaterThanOrEqual(0);
  });

  it("全零就是零", () => {
    expect(estimateCostUsd({ input: 0, output: 0, cacheRead: 0 })).toBe(0);
  });
});

describe("台北月界線", () => {
  it("往回退會跨年", () => {
    const now = new Date("2026-01-15T10:00:00+08:00");
    expect(taipeiMonthKey(taipeiMonthStart(0, now))).toBe("2026-01");
    expect(taipeiMonthKey(taipeiMonthStart(1, now))).toBe("2025-12");
    expect(taipeiMonthKey(taipeiMonthStart(13, now))).toBe("2024-12");
  });

  it("往前推一個月（報表的區間上界）也會跨年", () => {
    const now = new Date("2026-12-10T10:00:00+08:00");
    expect(taipeiMonthKey(taipeiMonthStart(-1, now))).toBe("2027-01");
  });

  it("月起點是台北的 00:00，不是 UTC 的", () => {
    const start = taipeiMonthStart(0, new Date("2026-11-20T10:00:00+08:00"));
    expect(start.toISOString()).toBe("2026-10-31T16:00:00.000Z");
  });

  it("日起點同理", () => {
    const start = taipeiDayStart(new Date("2026-11-20T00:30:00+08:00"));
    expect(start.toISOString()).toBe("2026-11-19T16:00:00.000Z");
  });
});

// 以下用真的資料庫。報表是全站聚合，dev.db 裡本來就有別的測試留下的列，
// 所以一律比較「做了事之後的差值」，不去斷言絕對數字。
const ids: string[] = [];
const newId = (tag: string) => {
  const id = `admin-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  ids.push(id);
  return id;
};

afterEach(async () => {
  await prisma.chatConversation.deleteMany({ where: { externalId: { in: ids } } });
  ids.length = 0;
});

async function seed(opts: {
  channel?: string;
  handoff?: boolean;
  handoffAt?: Date | null;
  mutedUntil?: Date | null;
  displayName?: string;
}) {
  return prisma.chatConversation.create({
    data: {
      channel: opts.channel ?? "line",
      externalId: newId("c"),
      displayName: opts.displayName ?? "測試客人",
      handoff: opts.handoff ?? false,
      handoffAt: opts.handoffAt ?? null,
      handoffReason: opts.handoff ? "客戶要求真人聯繫" : null,
      mutedUntil: opts.mutedUntil ?? null,
    },
  });
}

describe("月用量報表", () => {
  it("把本月的訊息、token 與費用算進本月那一列", async () => {
    const before = (await monthlyUsage(1))[0];

    const convo = await seed({});
    await prisma.chatMessage.createMany({
      data: [
        { conversationId: convo.id, role: "user", content: "你們做網站多少錢" },
        {
          conversationId: convo.id,
          role: "assistant",
          content: "方案從 NT$0 建置起。",
          inputTokens: 10_000,
          outputTokens: 200,
          cacheReadTokens: 9_000,
        },
      ],
    });

    const after = (await monthlyUsage(1))[0];
    expect(after.month).toBe(taipeiMonthKey());
    expect(after.inbound - before.inbound).toBe(1);
    expect(after.replies - before.replies).toBe(1);
    expect(after.conversations - before.conversations).toBe(1);
    expect(after.inputTokens - before.inputTokens).toBe(10_000);
    expect(after.cacheReadTokens - before.cacheReadTokens).toBe(9_000);
    expect(after.outputTokens - before.outputTokens).toBe(200);
    expect(after.costUsd - before.costUsd).toBeCloseTo(
      estimateCostUsd({ input: 10_000, output: 200, cacheRead: 9_000 }),
      10,
    );
  });

  it("轉人次數以首次判定的時間歸月", async () => {
    const before = await monthlyUsage(2);
    await seed({ handoff: true, handoffAt: new Date() });
    await seed({ handoff: true, handoffAt: taipeiMonthStart(1) });

    const after = await monthlyUsage(2);
    expect(after[0].handoffs - before[0].handoffs).toBe(1);
    expect(after[1].handoffs - before[1].handoffs).toBe(1);
  });

  it("要求幾個月就回幾列，從本月往回排", async () => {
    const rows = await monthlyUsage(3);
    expect(rows).toHaveLength(3);
    expect(rows[0].month).toBe(taipeiMonthKey());
    expect(rows[0].month > rows[1].month).toBe(true);
  });

  it("沒有輸入 token 時命中率算 0，不是 NaN", () => {
    const empty = {
      month: "2026-01",
      conversations: 0,
      inbound: 0,
      replies: 0,
      handoffs: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      costUsd: 0,
    };
    expect(cacheHitRate(empty)).toBe(0);
    expect(cacheHitRate({ ...empty, inputTokens: 100, cacheReadTokens: 90 })).toBeCloseTo(0.9);
  });
});

describe("對話列表", () => {
  it("帶出則數與最後一句，列表上才看得出球在誰手上", async () => {
    const convo = await seed({});
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, role: "user", content: "第一句" },
    });
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, role: "user", content: "我姓王 0912345678" },
    });

    const row = (await recentConversations(500)).find((c) => c.id === convo.id);
    expect(row).toBeDefined();
    expect(row!.messageCount).toBe(2);
    expect(row!.lastRole).toBe("user");
    expect(row!.lastContent).toBe("我姓王 0912345678");
  });

  it("沒有訊息的對話不會爆，最後一句是 null", async () => {
    const convo = await seed({});
    const row = (await recentConversations(500)).find((c) => c.id === convo.id);
    expect(row!.messageCount).toBe(0);
    expect(row!.lastContent).toBeNull();
  });
});

describe("單一對話", () => {
  it("逐字稿按時間正序，token 與費用是整段的總和", async () => {
    const convo = await seed({});
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, role: "user", content: "早" },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: convo.id,
        role: "assistant",
        content: "您好",
        inputTokens: 5_000,
        outputTokens: 50,
        cacheReadTokens: 4_800,
      },
    });
    await prisma.chatMessage.create({
      data: {
        conversationId: convo.id,
        role: "assistant",
        content: "請問想了解哪個方案",
        inputTokens: 5_100,
        outputTokens: 60,
        cacheReadTokens: 4_900,
      },
    });

    const detail = await conversationDetail(convo.id);
    expect(detail!.messages.map((m) => m.content)).toEqual(["早", "您好", "請問想了解哪個方案"]);
    expect(detail!.tokens).toEqual({ input: 10_100, output: 110, cacheRead: 9_700 });
    expect(detail!.costUsd).toBeCloseTo(
      estimateCostUsd({ input: 10_100, output: 110, cacheRead: 9_700 }),
      10,
    );
  });

  it("查不到的 id 回 null（網址被亂改時要走 404，不是 500）", async () => {
    expect(await conversationDetail(-1)).toBeNull();
  });
});

describe("接手與接回", () => {
  it("標記已處理會清掉待處理與靜音，但留下轉人紀錄", async () => {
    const handoffAt = new Date(Date.now() - 3_600_000);
    const convo = await seed({
      handoff: true,
      handoffAt,
      mutedUntil: new Date(Date.now() + 3_600_000),
    });

    await resolveHandoff(convo.id);

    const after = await prisma.chatConversation.findUnique({ where: { id: convo.id } });
    expect(after!.handoff).toBe(false);
    expect(after!.mutedUntil).toBeNull();
    // 清掉就數不到「這個月轉了幾次人」，報表會永遠是 0
    expect(after!.handoffAt?.getTime()).toBe(handoffAt.getTime());
    expect(after!.handoffReason).toBe("客戶要求真人聯繫");
  });

  it("手動接手會設定靜音與待處理，並補上原因", async () => {
    const convo = await seed({});
    await muteConversation(convo.id, 2);

    const after = await prisma.chatConversation.findUnique({ where: { id: convo.id } });
    expect(after!.handoff).toBe(true);
    expect(after!.handoffReason).toBe("站方手動接手");
    expect(after!.mutedUntil!.getTime()).toBeGreaterThan(Date.now() + 90 * 60_000);
    expect(after!.mutedUntil!.getTime()).toBeLessThan(Date.now() + 130 * 60_000);
  });

  it("手動接手不會蓋掉 AI 原本判定的轉人時間與原因", async () => {
    const handoffAt = new Date(Date.now() - 7_200_000);
    const convo = await seed({ handoff: true, handoffAt });

    await muteConversation(convo.id, 1);

    const after = await prisma.chatConversation.findUnique({ where: { id: convo.id } });
    expect(after!.handoffAt?.getTime()).toBe(handoffAt.getTime());
    expect(after!.handoffReason).toBe("客戶要求真人聯繫");
  });

  it("對不存在的對話操作不會丟例外（按鈕點兩下、資料已刪）", async () => {
    await expect(muteConversation(-1)).resolves.toBeUndefined();
  });
});
