import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkMacValue } from "@/lib/ecpay";
import { activeCare, issueReferralCode, nextCareMonth, redeemCareReward, referralEligibility, referralSummary } from "@/lib/referral";

const { admin } = vi.hoisted(() => ({ admin: vi.fn(async () => true) }));
vi.mock("@/lib/admin-auth", () => ({ isAdmin: admin }));
vi.mock("@/lib/mail", () => ({ sendMail: vi.fn(async () => true), notifyOwner: vi.fn(async () => true) }));

const directory = mkdtempSync(join(realpathSync(tmpdir()), "avalo-referral-"));
let db: PrismaClient;
let payment: typeof import("@/lib/ecpay-process").processPaymentResult;
let period: typeof import("@/lib/ecpay-process").processPeriodCharge;
let counter = 0;

beforeAll(async () => {
  const file = join(directory, "test.db");
  writeFileSync(file, "");
  vi.stubEnv("DATABASE_URL", `file:${file}`);
  vi.stubEnv("ECPAY_INVOICE_START_AT", "2099-01-01T00:00:00+08:00");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "pipe" });
  ({ prisma: db } = await import("@/lib/prisma"));
  ({ processPaymentResult: payment, processPeriodCharge: period } = await import("@/lib/ecpay-process"));
}, 30_000);

beforeEach(async () => {
  admin.mockResolvedValue(true);
  await db.careReward.deleteMany();
  await db.referral.deleteMany();
  await db.referralCode.deleteMany();
  await db.invoice.deleteMany();
  await db.subscription.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
});

afterAll(async () => {
  await db?.$disconnect();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

function signed(fields: Record<string, string>) {
  const values = { MerchantID: "2000132", RtnCode: "1", ...fields };
  return { ...values, CheckMacValue: checkMacValue(values) };
}
async function order(options: { email?: string; phone?: string; code?: string; recurring?: boolean } = {}) {
  const n = ++counter;
  const id = `AVLR${String(n).padStart(7, "0")}`;
  return db.order.create({ data: {
    id, email: options.email ?? `friend${n}@example.com`, phone: options.phone ?? `0912${String(n).padStart(6, "0")}`,
    name: "測試", items: JSON.stringify([{ sku: options.recurring ? "care-basic" : "site-rescue", qty: 1 }]),
    referralCode: options.code, oneTimeTotal: options.recurring ? 0 : 100, monthlyTotal: options.recurring ? 100 : 0,
    payments: { create: { merchantTradeNo: id + (options.recurring ? "2" : "1"), kind: options.recurring ? "period" : "onetime", amount: 105 } },
    ...(options.recurring ? { subscriptions: { create: { merchantTradeNo: id + "2", sku: "care-basic", monthlyAmount: 105,
      launchedAt: new Date(), termMonths: 12, commitEndsAt: new Date("2027-11-18T00:00:00+08:00") } } } : {}),
  } });
}
async function owner() {
  const o = await order({ email: "Owner@Example.com", phone: "0912345678", recurring: true });
  await payment(signed({ MerchantTradeNo: o.id + "2", TradeAmt: "105" }));
  const invitation = await issueReferralCode(db, o.email);
  return { ...o, code: invitation.code };
}
async function pay(id: string, fields: Record<string, string> = {}) {
  await payment(signed({ MerchantTradeNo: id + "1", TradeAmt: "105", ...fields }));
}

describe("付費推薦與免費維護月份", () => {
  it("只有正常付費維護可取得獨立公開碼；同 Email 換卡仍取得原碼", async () => {
    const pending = await order({ recurring: true });
    await expect(issueReferralCode(db, pending.email)).rejects.toThrow("inactive");
    const o = await owner();
    expect(o.code).toMatch(/^AV-[A-F0-9]{12}$/);
    expect(o.code).not.toContain(o.id);
    expect((await issueReferralCode(db, " owner@EXAMPLE.COM ")).code).toBe(o.code);
    await db.subscription.update({ where: { merchantTradeNo: o.id + "2" }, data: { pastDueSince: new Date() } });
    expect(await activeCare(db, o.email)).toHaveLength(0);
    await expect(issueReferralCode(db, o.email)).rejects.toThrow("inactive");
  });

  it("阻擋無效碼、自己推薦自己，以及同 Email／電話的既有付費客戶", async () => {
    const o = await owner();
    expect(await referralEligibility(db, "BAD", { email: "new@example.com", phone: "0900000000" })).toBe(false);
    expect(await referralEligibility(db, o.code, { email: "OWNER@example.com", phone: "0900000000" })).toBe(false);
    expect(await referralEligibility(db, o.code, { email: "alias@example.com", phone: "+886 912-345-678" })).toBe(false);
    const old = await order({ email: "PAID@example.com", phone: "0922000000" });
    await pay(old.id);
    expect(await referralEligibility(db, o.code, { email: "paid@EXAMPLE.com", phone: "0900000000" })).toBe(false);
    expect(await referralEligibility(db, o.code, { email: "other@example.com", phone: "+886 922-000-000" })).toBe(false);
    expect(await referralEligibility(db, o.code, { email: "new@example.com", phone: "0900000000" })).toBe(true);
  });

  it("付款失敗、模擬款及金額／簽章錯誤都不核發；並行重送只核發雙方各一次", async () => {
    const o = await owner();
    const friend = await order({ code: o.code });
    await pay(friend.id, { RtnCode: "0" });
    await pay(friend.id, { SimulatePaid: "1" });
    await expect(pay(friend.id, { TradeAmt: "1" })).rejects.toThrow("TradeAmt");
    await expect(payment({ ...signed({ MerchantTradeNo: friend.id + "1", TradeAmt: "105" }), CheckMacValue: "bad" }))
      .rejects.toThrow("CheckMacValue");
    expect(await db.careReward.count()).toBe(0);
    await Promise.all([pay(friend.id), pay(friend.id)]);
    expect(await db.referral.count()).toBe(1);
    expect(await db.careReward.count()).toBe(2);
    expect((await referralSummary(db, o.email)).available).toBe(1);
    expect((await referralSummary(db, friend.email)).available).toBe(1);
    await pay(friend.id);
    const repeat = await order({ email: friend.email.toUpperCase(), code: o.code });
    await pay(repeat.id);
    const samePhone = await order({ phone: friend.phone, code: o.code });
    await pay(samePhone.id);
    expect(await db.careReward.count()).toBe(2);
  });

  it("任一付費品項（包括促銷保留金）皆適用，不同新客戶可以累積", async () => {
    const o = await owner();
    const f1 = await order({ code: o.code });
    await db.order.update({ where: { id: f1.id }, data: { items: '[{"sku":"launch-deposit","qty":1}]' } });
    await pay(f1.id);
    const f2 = await order({ code: o.code, recurring: true });
    await payment(signed({ MerchantTradeNo: f2.id + "2", TradeAmt: "105" }));
    await period(signed({ MerchantTradeNo: f2.id + "2", Amount: "105", TotalSuccessTimes: "2" }));
    expect(await db.referral.count()).toBe(2);
    expect((await referralSummary(db, o.email)).available).toBe(2);
    expect((await referralSummary(db, f2.email)).available).toBe(1);
  });

  it("同一新客戶同時付兩張訂單，兩張款項均入帳但獎勵只發一組", async () => {
    const o = await owner();
    const first = await order({ code: o.code, email: "same@example.com", phone: "0933000001" });
    const second = await order({ code: o.code, email: "SAME@example.com", phone: "0933000002" });
    await Promise.all([pay(first.id), pay(second.id)]);
    expect(await db.payment.count({ where: { orderId: { in: [first.id, second.id] }, status: "paid" } })).toBe(2);
    expect(await db.referral.count()).toBe(1);
    expect(await db.careReward.count()).toBe(2);
  });

  it("不同獎勵不能兌換同一訂閱上重疊的免費月份，連續月份可以", async () => {
    const o = await owner();
    const first = await order({ code: o.code });
    const second = await order({ code: o.code });
    await pay(first.id);
    await pay(second.id);
    const rewards = await db.careReward.findMany({ where: { email: "owner@example.com" } });
    const input = { mtn: o.id + "2", freeFrom: new Date("2027-01-18T00:00:00+08:00"), billingReference: "綠界測試排程核對完成" };
    await db.$transaction((tx) => redeemCareReward(tx, { ...input, id: rewards[0].id }));
    await expect(db.$transaction((tx) => redeemCareReward(tx, { ...input, id: rewards[1].id }))).rejects.toThrow("overlapping");
    expect((await referralSummary(db, o.email)).available).toBe(1);
    await db.$transaction((tx) => redeemCareReward(tx, { ...input, id: rewards[1].id, freeFrom: new Date("2027-02-18T00:00:00+08:00") }));
    expect((await referralSummary(db, o.email)).available).toBe(0);
  });

  it("首期失敗後才首次實收仍可得獎，後續續扣不再核發", async () => {
    const o = await owner();
    const friend = await order({ code: o.code, recurring: true });
    await payment(signed({ MerchantTradeNo: friend.id + "2", TradeAmt: "105", RtnCode: "0" }));
    await period(signed({ MerchantTradeNo: friend.id + "2", Amount: "105", TotalSuccessTimes: "2" }));
    await period(signed({ MerchantTradeNo: friend.id + "2", Amount: "105", TotalSuccessTimes: "3" }));
    expect(await db.referral.count()).toBe(1);
    expect(await db.careReward.count()).toBe(2);
  });

  it("付款時介紹人已停用或欠費不會發出新獎勵", async () => {
    const o = await owner();
    const friend = await order({ code: o.code });
    await db.subscription.update({ where: { merchantTradeNo: o.id + "2" }, data: { status: "cancelled" } });
    await pay(friend.id);
    expect(await db.careReward.count()).toBe(0);
  });

  it("沒有維護的朋友先保留，日後同 Email 啟用維護可使用；不能轉用他人訂閱", async () => {
    const o = await owner();
    const friend = await order({ code: o.code });
    await pay(friend.id);
    const reward = await db.careReward.findFirstOrThrow({ where: { email: friend.email } });
    const input = { id: reward.id, mtn: o.id + "2", freeFrom: new Date("2027-01-31T00:00:00+08:00"), billingReference: "綠界已設定，2027/02/28 恢復扣款" };
    await expect(db.$transaction((tx) => redeemCareReward(tx, input))).rejects.toThrow("invalid subscription");
    const care = await order({ email: friend.email.toUpperCase(), recurring: true });
    await payment(signed({ MerchantTradeNo: care.id + "2", TradeAmt: "105" }));
    const before = await db.subscription.findUniqueOrThrow({ where: { merchantTradeNo: care.id + "2" } });
    const result = await db.$transaction((tx) => redeemCareReward(tx, { ...input, mtn: care.id + "2" }));
    expect(result.freeUntil.toISOString()).toBe("2027-02-27T16:00:00.000Z");
    expect((await referralSummary(db, friend.email)).available).toBe(0);
    const after = await db.subscription.findUniqueOrThrow({ where: { merchantTradeNo: care.id + "2" } });
    expect(after.commitEndsAt).toEqual(before.commitEndsAt);
    expect(after.termMonths).toBe(before.termMonths);
    expect(after.monthlyAmount).toBe(before.monthlyAmount);
    await expect(db.$transaction((tx) => redeemCareReward(tx, { ...input, mtn: care.id + "2" }))).rejects.toThrow("unavailable");
  });

  it("月底、閏年依台北日曆計算一個月", () => {
    expect(nextCareMonth(new Date("2028-01-31T00:00:00+08:00")).toISOString()).toBe("2028-02-28T16:00:00.000Z");
    expect(nextCareMonth(new Date("2026-11-18T00:00:00+08:00")).toISOString()).toBe("2026-12-17T16:00:00.000Z");
  });

  it("後台兌換要管理員與同來源，缺少排程核對紀錄不能標記已使用", async () => {
    const { POST } = await import("@/app/api/admin/referral-rewards/route");
    const request = (origin = "http://localhost:3210") => new NextRequest("http://localhost:3210/api/admin/referral-rewards", {
      method: "POST", headers: { host: "localhost:3210", origin }, body: new URLSearchParams({ id: "1", mtn: "AVLR00000012", freeFrom: "2027-01-31", confirmed: "yes" }),
    });
    admin.mockResolvedValueOnce(false);
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("https://evil.example"))).status).toBe(403);
    expect((await POST(request())).headers.get("location")).toContain("error=invalid");
  });

  it("結帳拒絕無效邀請碼，不建立訂單；不填碼維持原結帳行為", async () => {
    const { POST } = await import("@/app/api/checkout/route");
    const { LEGAL_VERSION } = await import("@/lib/legal-content");
    const request = (referralCode: string) => new NextRequest("http://localhost:3210/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: "新朋友", email: "checkout@example.com", phone: "0933000000", agree: "yes", termsVersion: LEGAL_VERSION,
        items: [{ sku: "site-rescue", qty: 1 }], referralCode,
      }),
    });
    expect((await POST(request("INVALID"))).status).toBe(422);
    expect(await db.order.count()).toBe(0);
    const o = await owner();
    expect((await POST(request(o.code.toLowerCase()))).status).toBe(200);
    expect(await db.order.findFirst({ where: { email: "checkout@example.com" } })).toMatchObject({ referralCode: o.code });
    expect((await POST(request(""))).status).toBe(200);
  });
});
