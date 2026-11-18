import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { checkMacValue } from "@/lib/ecpay";
import { validTaxId } from "@/lib/invoice-details";

const { invoiceApi } = vi.hoisted(() => ({ invoiceApi: vi.fn() }));
vi.mock("@/lib/ecpay-invoice", async (original) => ({
  ...await original<typeof import("@/lib/ecpay-invoice")>(),
  invoiceApi,
  invoiceCredentials: () => ({}),
}));
vi.mock("@/lib/mail", () => ({ sendMail: vi.fn(), notifyOwner: vi.fn() }));

const directory = mkdtempSync(join(realpathSync(tmpdir()), "avalo-invoice-"));
const chargedAt = "2026/01/10 13:01:00";
let prisma: PrismaClient;
let processPaymentResult: typeof import("@/lib/ecpay-process").processPaymentResult;
let processPeriodCharge: typeof import("@/lib/ecpay-process").processPeriodCharge;
let runInvoiceQueue: typeof import("@/lib/invoices").runInvoiceQueue;

beforeAll(async () => {
  const dbPath = join(directory, "test.db");
  writeFileSync(dbPath, "");
  vi.stubEnv("DATABASE_URL", `file:${dbPath}`);
  vi.stubEnv("ECPAY_INVOICE_START_AT", "2026-01-10T13:00:00+08:00");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "pipe" });
  ({ prisma } = await import("@/lib/prisma"));
  ({ processPaymentResult, processPeriodCharge } = await import("@/lib/ecpay-process"));
  ({ runInvoiceQueue } = await import("@/lib/invoices"));
}, 30_000);

afterAll(async () => {
  await prisma?.$disconnect();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

function callback(fields: Record<string, string>) {
  const params = { MerchantID: "2000132", RtnCode: "1", ...fields };
  return { ...params, CheckMacValue: checkMacValue(params) };
}

async function order(id: string, sku: string, invoice = {}) {
  return prisma.order.create({
    data: {
      id, name: "測試", email: "test@example.com", phone: "0900000000",
      items: JSON.stringify([{ sku, qty: 1 }]), ...invoice,
    },
  });
}

describe("Avalo 綠界電子發票", () => {
  it("只把明確同意的正式首次實收回報為一次廣告成交", async () => {
    vi.stubEnv("ECPAY_ENV", "production");
    try {
      const { id } = await order("AVLADSPAY", "site-rescue", {
        adsMeasurementAt: new Date(), adsOppref: "test-click", oneTimeTotal: 100,
      });
      const mtn = id + "1";
      await prisma.payment.create({ data: { orderId: id, merchantTradeNo: mtn, kind: "onetime", amount: 105 } });
      const fields = { MerchantTradeNo: mtn, TradeAmt: "105", PaymentDate: chargedAt };
      await processPaymentResult(callback({ ...fields, SimulatePaid: "1" }));
      await processPaymentResult(callback({ ...fields, RtnCode: "0" }));
      expect(await prisma.adsConversion.count({ where: { id: "avalo-order-" + id } })).toBe(0);

      await Promise.all([processPaymentResult(callback(fields)), processPaymentResult(callback(fields))]);
      const conversion = await prisma.adsConversion.findUniqueOrThrow({ where: { id: "avalo-order-" + id } });
      expect(JSON.parse(conversion.payload)).toMatchObject({
        type: "order_created", oppref: "test-click", data: { type: "contents", amount: 10500, currency: "TWD" },
      });
      expect(await prisma.order.findUnique({ where: { id } })).toMatchObject({ adsOppref: null, adsObref: null });
    } finally {
      vi.stubEnv("ECPAY_ENV", "stage");
    }
  });

  it("收款回呼並行重送只入帳一次，逾時後查詢同一張發票再更新狀態", async () => {
    const { id } = await order("AVLSINGLE", "site-rescue");
    const mtn = id + "1";
    await prisma.payment.create({ data: { orderId: id, merchantTradeNo: mtn, kind: "onetime", amount: 105 } });
    const fields = { MerchantTradeNo: mtn, TradeAmt: "105", PaymentDate: chargedAt };

    await processPaymentResult(callback({ ...fields, SimulatePaid: "1" }));
    await expect(processPaymentResult(callback({ ...fields, TradeAmt: "100" }))).rejects.toThrow("TradeAmt");
    expect(await prisma.invoice.count({ where: { orderId: id } })).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({ where: { merchantTradeNo: mtn } })).status).toBe("pending");

    await Promise.all([processPaymentResult(callback(fields)), processPaymentResult(callback(fields))]);
    const jobs = await prisma.invoice.findMany({ where: { orderId: id } });
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job).toMatchObject({ amount: 105, status: "pending" });

    invoiceApi.mockRejectedValueOnce(new Error("request timed out after issuance"));
    await Promise.all([runInvoiceQueue(), runInvoiceQueue()]);
    expect(invoiceApi).toHaveBeenCalledTimes(1);
    expect(invoiceApi).toHaveBeenLastCalledWith("Issue", expect.objectContaining({
      RelateNumber: job.reference, SalesAmount: 105, CustomerEmail: "test@example.com",
      Print: "0", CarrierType: "1",
    }));

    await prisma.invoice.update({ where: { reference: job.reference }, data: { nextAttemptAt: new Date(0) } });
    invoiceApi.mockResolvedValueOnce({
      RtnCode: 1, IIS_Relate_Number: job.reference, IIS_Number: "AA12345678", IIS_Sales_Amount: 105,
      IIS_Issue_Status: "1", IIS_Invalid_Status: "0",
    });
    await runInvoiceQueue();
    expect(invoiceApi).toHaveBeenCalledTimes(2);
    expect(invoiceApi).toHaveBeenLastCalledWith("GetIssue", { RelateNumber: job.reference });
    expect(await prisma.invoice.findUniqueOrThrow({ where: { reference: job.reference } }))
      .toMatchObject({ status: "issued", invoiceNo: "AA12345678" });
  });

  it("首期和每筆後續成功扣款各開一張，舊扣款、失敗及模擬通知不開票", async () => {
    const { id } = await order("AVLPERIOD", "care-basic", {
      company: "測試公司", taxId: "04595252", invoiceAddress: "臺北市測試路一號",
    });
    const mtn = id + "2";
    await prisma.payment.create({ data: { orderId: id, merchantTradeNo: mtn, kind: "period", amount: 210 } });
    await prisma.subscription.create({ data: { orderId: id, merchantTradeNo: mtn, sku: "care-basic", monthlyAmount: 210 } });

    await processPaymentResult(callback({ MerchantTradeNo: mtn, TradeAmt: "210", PaymentDate: chargedAt }));
    const period = { MerchantTradeNo: mtn, Amount: "210", ProcessDate: chargedAt, TotalSuccessTimes: "2" };
    await processPeriodCharge(callback({ ...period, TotalSuccessTimes: "1" }));
    await processPeriodCharge(callback({ ...period, RtnCode: "0" }));
    await processPeriodCharge(callback({ ...period, SimulatePaid: "1" }));
    await processPeriodCharge(callback({ ...period, ProcessDate: "2026/01/09 13:00:00" }));
    await Promise.all([processPeriodCharge(callback(period)), processPeriodCharge(callback(period))]);
    const invoices = await prisma.invoice.findMany({ where: { orderId: id } });
    expect(invoices).toHaveLength(2);
    expect(new Set(invoices.map(({ reference }) => reference)).size).toBe(2);

    invoiceApi.mockClear().mockResolvedValue({ RtnCode: 1, InvoiceNo: "BB12345678" });
    await runInvoiceQueue();
    expect(invoiceApi).toHaveBeenCalledTimes(2);
    expect(invoiceApi).toHaveBeenCalledWith("Issue", expect.objectContaining({
      SalesAmount: 210, CustomerIdentifier: "04595252", CustomerName: "測試公司",
      CustomerAddr: "臺北市測試路一號", Print: "1", CarrierType: "",
    }));
  });

  it("保留促銷保留金的已付狀態，並標記會計人工處理", async () => {
    const { id } = await order("AVLDEPOSIT", "launch-deposit");
    const mtn = id + "1";
    await prisma.payment.create({ data: { orderId: id, merchantTradeNo: mtn, kind: "onetime", amount: 2100 } });
    await processPaymentResult(callback({ MerchantTradeNo: mtn, TradeAmt: "2100", PaymentDate: chargedAt }));
    expect((await prisma.payment.findUniqueOrThrow({ where: { merchantTradeNo: mtn } })).status).toBe("paid");
    expect(await prisma.invoice.findFirst({ where: { orderId: id } })).toMatchObject({
      status: "manual", lastError: "促銷席次保留金需會計確認",
    });
  });

  it("接受財政部的新統編檢核範例", () => {
    expect(validTaxId("04595252")).toBe(true);
    expect(validTaxId("10458570")).toBe(true);
    expect(validTaxId("04595253")).toBe(false);
  });
});
