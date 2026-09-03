import { describe, it, expect, beforeEach, vi } from "vitest";

// 訂閱生命週期的行為測試。重點在「終止舊授權」與「建立新授權」的順序與失敗處理——
// 這裡出錯的代價是客戶被同時扣兩筆，或舊授權沒斷卻以為斷了。

const h = vi.hoisted(() => ({
  cancelPeriod: vi.fn(),
  sendMail: vi.fn(async (_o: { to: string; subject: string; text: string }) => true),
  notifyOwner: vi.fn(async (_s: string, _t: string) => true),
  db: {
    subscription: { update: vi.fn(async (a: unknown) => a), create: vi.fn(async (a: unknown) => a) },
    payment: {
      updateMany: vi.fn(async (a: unknown) => a),
      create: vi.fn(async (a: unknown) => a),
      count: vi.fn(async () => 2),
      findMany: vi.fn(async () => [] as { status: string }[]),
    },
    order: { update: vi.fn(async ({ data }: { data: unknown }) => data) },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: h.db }));
vi.mock("../src/lib/ecpay", () => ({ cancelPeriod: h.cancelPeriod }));
vi.mock("../src/lib/mail", () => ({ sendMail: h.sendMail, notifyOwner: h.notifyOwner }));

const sub = (over: Record<string, unknown> = {}) => ({
  id: 7,
  orderId: "AVLTEST001",
  merchantTradeNo: "AVLTEST0012",
  sku: "care-basic",
  monthlyAmount: 3140,
  status: "active",
  totalSuccessTimes: 3,
  termMonths: 12,
  commitEndsAt: new Date("2027-01-01"),
  order: { id: "AVLTEST001", name: "測試", email: "t@example.com", locale: "zh-TW", items: "[]" },
  ...over,
}) as never;

beforeEach(() => {
  vi.clearAllMocks();
  h.cancelPeriod.mockResolvedValue({ success: true, rtnCode: "1", rtnMsg: "OK", raw: "RtnCode=1" });
  h.db.payment.count.mockResolvedValue(2);
  h.db.payment.findMany.mockResolvedValue([]);
});

describe("markLaunched（網站上線＝月費開始計時）", () => {
  const pending = (over: Record<string, unknown> = {}) =>
    sub({ status: "pending", launchedAt: null, totalSuccessTimes: 0, commitEndsAt: null, ...over });

  it("寫下上線日、自今天起算承諾期，並寄出授權連結", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    h.db.payment.findMany.mockResolvedValue([{ kind: "onetime", status: "paid" }] as never);

    const before = Date.now();
    const r = await markLaunched(pending());
    expect(r).toEqual({ ok: true, mailed: true });

    const upd = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, Date> };
    expect(upd.data.launchedAt.getTime()).toBeGreaterThanOrEqual(before);
    // 承諾期 12 個月自「今天」起算，不是自下單日——製作期不算進客戶買的服務裡
    const expected = new Date(new Date(upd.data.launchedAt).setMonth(upd.data.launchedAt.getMonth() + 12));
    expect(upd.data.commitEndsAt.getTime()).toBe(expected.getTime());
    expect(h.sendMail).toHaveBeenCalledTimes(1);
    expect(h.sendMail.mock.calls[0][0].to).toBe("t@example.com");
  });


  it("零元啟動：保留金折抵一期，承諾期只再算 23 個月（否則會多扣一期）", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    h.db.payment.findMany.mockResolvedValue([{ kind: "onetime", status: "paid" }] as never);

    await markLaunched(
      pending({
        sku: "launch-care",
        termMonths: 24,
        order: {
          id: "AVLTEST001",
          name: "測試",
          email: "t@example.com",
          locale: "zh-TW",
          items: JSON.stringify([{ sku: "launch-deposit", qty: 1 }, { sku: "launch-care", qty: 1 }]),
        },
      })
    );

    const upd = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, Date> };
    const launched = upd.data.launchedAt;
    // 綠界授權當下就扣第一期，所以 24 期＝保留金 1 期 ＋ 定期定額 23 期
    const expected = new Date(new Date(launched).setMonth(launched.getMonth() + 23));
    expect(upd.data.commitEndsAt.getTime()).toBe(expected.getTime());
  });

  it("一次性款項未付清就不能標記上線（否則免費交站又開始跑承諾期）", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    h.db.payment.findMany.mockResolvedValue([{ kind: "onetime", status: "pending" }] as never);

    expect(await markLaunched(pending())).toEqual({ ok: false, error: "build-unpaid" });
    expect(h.db.subscription.update).not.toHaveBeenCalled();
    expect(h.sendMail).not.toHaveBeenCalled();
  });

  it("重複標記無效（避免承諾期被按第二次往後推）", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    const r = await markLaunched(pending({ launchedAt: new Date("2026-09-01") }));
    expect(r).toEqual({ ok: false, error: "already-launched" });
    expect(h.db.subscription.update).not.toHaveBeenCalled();
  });

  it("非待授權狀態不能標記上線", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    expect(await markLaunched(pending({ status: "active" }))).toEqual({
      ok: false,
      error: "not-pending",
    });
  });

  it("寄信失敗就不記提醒次數，留給 cron 隔天重試", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    h.db.payment.findMany.mockResolvedValue([] as never);
    h.sendMail.mockResolvedValueOnce(false);

    const r = await markLaunched(pending());
    expect(r).toEqual({ ok: true, mailed: false });
    const upd = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(upd.data.authLinkSentAt).toBeNull();
    expect(upd.data.remindersSent).toBe(0);
    // 但上線日仍然寫下：網站確實上線了，這件事不因寄信失敗而改變
    expect(upd.data.launchedAt).toBeInstanceOf(Date);
  });

  it("無綁約方案（單購維護升級而來）不寫承諾期", async () => {
    const { markLaunched } = await import("../src/lib/subscription");
    h.db.payment.findMany.mockResolvedValue([] as never);
    await markLaunched(pending({ termMonths: null }));
    const upd = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(upd.data.commitEndsAt).toBeNull();
  });
});

describe("replaceSubscription（換方案／換卡）", () => {
  it("終止舊授權後才建立新訂閱，並沿用原本的承諾期", async () => {
    const { replaceSubscription } = await import("../src/lib/subscription");
    const r = await replaceSubscription(sub(), "care-growth", "change");

    expect(r).toEqual({ ok: true, mtn: "AVLTEST0013" }); // 尾碼接續既有付款筆數
    expect(h.cancelPeriod).toHaveBeenCalledWith("AVLTEST0012");

    const created = h.db.subscription.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(created.data.sku).toBe("care-growth");
    expect(created.data.monthlyAmount).toBe(6290); // 5,990 未稅 → 含稅
    expect(created.data.termMonths).toBe(12); // 換方案不重新起算綁約
    expect(created.data.commitEndsAt).toEqual(new Date("2027-01-01"));
    expect(created.data.previousMtn).toBe("AVLTEST0012");

    const old = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(old.data.status).toBe("replaced");
    // 舊的待付授權要作廢，否則訂單狀態永遠停在 partial
    expect(h.db.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
  });

  it("綠界終止失敗時不建立新訂閱（避免同時存在兩筆有效授權）", async () => {
    h.cancelPeriod.mockResolvedValue({ success: false, rtnCode: "10200073", rtnMsg: "NG", raw: "x" });
    const { replaceSubscription } = await import("../src/lib/subscription");
    const r = await replaceSubscription(sub(), "care-growth", "change");

    expect(r).toEqual({ ok: false, error: "ecpay-cancel-failed" });
    expect(h.db.subscription.create).not.toHaveBeenCalled();
    expect(h.db.payment.create).not.toHaveBeenCalled();
  });

  it("尚未授權（pending）不打綠界終止 API", async () => {
    const { replaceSubscription } = await import("../src/lib/subscription");
    const r = await replaceSubscription(sub({ status: "pending" }), "care-growth", "change");

    expect(r.ok).toBe(true);
    expect(h.cancelPeriod).not.toHaveBeenCalled();
  });

  it("已終止或已換過的訂閱不能再換", async () => {
    const { replaceSubscription } = await import("../src/lib/subscription");
    for (const status of ["cancelled", "replaced"]) {
      const r = await replaceSubscription(sub({ status }), "care-growth", "change");
      expect(r).toEqual({ ok: false, error: "already-ended" });
    }
    expect(h.cancelPeriod).not.toHaveBeenCalled();
  });

  it("不接受一次性方案或不存在的 SKU", async () => {
    const { replaceSubscription } = await import("../src/lib/subscription");
    expect(await replaceSubscription(sub(), "web-basic", "change")).toEqual({ ok: false, error: "bad-sku" });
    expect(await replaceSubscription(sub(), "nope", "change")).toEqual({ ok: false, error: "bad-sku" });
  });
});

describe("cancelSubscription", () => {
  it("客戶自助終止會寄確認信給客戶", async () => {
    const { cancelSubscription } = await import("../src/lib/subscription");
    const r = await cancelSubscription(sub(), "customer");

    expect(r.ok).toBe(true);
    expect(h.sendMail).toHaveBeenCalledTimes(1);
    expect(h.sendMail.mock.calls[0][0].to).toBe("t@example.com");
    // 綁約未到期要在信裡講明白
    expect(h.sendMail.mock.calls[0][0].text).toContain("最短承諾期");
    expect(h.notifyOwner).toHaveBeenCalled();
  });

  it("後台終止只通知站方，不寄信給客戶", async () => {
    const { cancelSubscription } = await import("../src/lib/subscription");
    await cancelSubscription(sub(), "admin");

    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.notifyOwner).toHaveBeenCalled();
  });

  it("綠界終止失敗時不標記為已終止", async () => {
    h.cancelPeriod.mockResolvedValue({ success: false, rtnCode: "9", rtnMsg: "NG", raw: "x" });
    const { cancelSubscription } = await import("../src/lib/subscription");
    const r = await cancelSubscription(sub(), "customer");

    expect(r.ok).toBe(false);
    const update = h.db.subscription.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(update.data.status).toBeUndefined(); // 只記下失敗原因，狀態不動
  });
});

describe("recalcOrderStatus", () => {
  const cases: [string, { status: string }[], string][] = [
    ["全部付清 → paid", [{ status: "paid" }, { status: "paid" }], "paid"],
    ["建置已付、維護待授權 → partial", [{ status: "paid" }, { status: "pending" }], "partial"],
    // 「還沒付」不等於「付失敗」：換方案後兩筆都可能還是 pending
    ["都還沒付 → pending", [{ status: "pending" }, { status: "pending" }], "pending"],
    ["建置付失敗 → failed", [{ status: "failed" }, { status: "pending" }], "failed"],
    ["付了一筆、另一筆失敗 → partial", [{ status: "paid" }, { status: "failed" }], "partial"],
    // 換方案作廢的舊授權不列入計算，否則訂單永遠回不到 paid
    ["作廢的舊授權不計入 → paid", [{ status: "paid" }, { status: "cancelled" }], "paid"],
  ];
  for (const [name, payments, expected] of cases) {
    it(name, async () => {
      h.db.payment.findMany.mockResolvedValue(payments);
      const { recalcOrderStatus } = await import("../src/lib/subscription");
      await recalcOrderStatus("AVLTEST001");
      expect(h.db.order.update.mock.calls.at(-1)?.[0].data).toEqual({ status: expected });
    });
  }
});

describe("subscriptionUrl（信件與 redirect 用的連結）", () => {
  it("預設語系不帶前綴、英文帶 /en —— 帶錯會多吃一次 307 轉址", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://avalokite.xyz";
    const { subscriptionUrl } = await import("../src/lib/subscription");
    expect(subscriptionUrl("AVLX2", "zh-TW")).toBe("https://avalokite.xyz/subscription/AVLX2");
    expect(subscriptionUrl("AVLX2", "en")).toBe("https://avalokite.xyz/en/subscription/AVLX2");
  });
});
