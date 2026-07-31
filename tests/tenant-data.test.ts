import { describe, it, expect, beforeEach, vi } from "vitest";

// 行為測試：斷言送進 Prisma 的 where 一定帶 tenantId。
// 與 tenant-isolation.test.ts 的原始碼掃描互補——那支擋「寫法」，這支擋「實際傳出去的查詢」。

const calls: { method: string; args: Record<string, unknown> }[] = [];
// updateMany 的回傳值可調，用來模擬「這筆不屬於本租戶」（count 0）。
// 刻意不用 doMock/doUnmock 換 mock —— doUnmock 會讓之後的測試拿到真的 prisma。
const state = { updateManyCount: 1 };
const record = (method: string) => (args: Record<string, unknown>) => {
  calls.push({ method, args });
  if (method === "count") return 0;
  if (method === "updateMany") return { count: state.updateManyCount };
  return [];
};

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    inquiry: {
      findMany: vi.fn(record("findMany")),
      findFirst: vi.fn(record("findFirst")),
      count: vi.fn(record("count")),
      updateMany: vi.fn(record("updateMany")),
    },
  },
}));

const TENANT = "wenshan";

beforeEach(() => {
  calls.length = 0;
  state.updateManyCount = 1;
});

describe("每個查詢都被限制在單一租戶內", () => {
  it("所有 API 傳給 Prisma 的 where 都含正確的 tenantId", async () => {
    const d = await import("../src/lib/tenant-data");

    await d.listInquiries(TENANT);
    await d.listInquiries(TENANT, { onlyUnhandled: true, skip: 50 });
    await d.countInquiries(TENANT);
    await d.getInquiry(TENANT, 7);
    await d.setHandled(TENANT, 7, true);
    await d.allInquiriesForExport(TENANT);

    expect(calls.length).toBe(6);
    for (const c of calls) {
      const where = (c.args as { where?: Record<string, unknown> }).where;
      expect(where, `${c.method} 沒有 where`).toBeDefined();
      expect(where!.tenantId, `${c.method} 的 where 缺少 tenantId`).toBe(TENANT);
    }
  });

  it("getInquiry 用 findFirst 且 id 與 tenantId 同時在 where 內", async () => {
    const d = await import("../src/lib/tenant-data");
    await d.getInquiry(TENANT, 42);
    expect(calls[0].method).toBe("findFirst");
    expect(calls[0].args.where).toEqual({ id: 42, tenantId: TENANT });
  });

  it("setHandled 用 updateMany，租戶條件在 where 而非事後檢查", async () => {
    const d = await import("../src/lib/tenant-data");
    await d.setHandled(TENANT, 42, true);
    expect(calls[0].method).toBe("updateMany");
    expect(calls[0].args.where).toEqual({ id: 42, tenantId: TENANT });
  });

  it("setHandled 在沒改到任何一筆時回 false（等同未授權）", async () => {
    const d = await import("../src/lib/tenant-data");
    state.updateManyCount = 0; // 模擬該 id 不屬於本租戶
    expect(await d.setHandled(TENANT, 999, true)).toBe(false);
    // 仍然有帶 tenantId 送出查詢，只是沒有命中
    expect(calls[0].args.where).toEqual({ id: 999, tenantId: TENANT });
  });

  it("標記已處理時寫入 handledAt，取消時清空", async () => {
    const d = await import("../src/lib/tenant-data");
    await d.setHandled(TENANT, 1, true);
    expect((calls[0].args.data as { handledAt: Date | null }).handledAt).toBeInstanceOf(Date);
    calls.length = 0;
    await d.setHandled(TENANT, 1, false);
    expect((calls[0].args.data as { handledAt: Date | null }).handledAt).toBeNull();
  });

  it("列表一律依時間倒序並套用分頁上限", async () => {
    const d = await import("../src/lib/tenant-data");
    await d.listInquiries(TENANT);
    expect(calls[0].args.orderBy).toEqual({ createdAt: "desc" });
    expect(calls[0].args.take).toBe(d.PAGE_SIZE);
  });
});
