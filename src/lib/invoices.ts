import type { Order, Prisma } from "@prisma/client";
import { invoiceApi, invoiceCredentials, invoiceEnvironment, invoiceStartAt } from "@/lib/ecpay-invoice";
import {
  INVOICE_ADDRESS_LIMIT, INVOICE_COMPANY_LIMIT, INVOICE_EMAIL_LIMIT, invoiceCarrierPattern, validTaxId,
} from "@/lib/invoice-details";
import { notifyOwner } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getProduct } from "@/lib/products";

const MAX_ATTEMPTS = 6;
const MINUTE = 60_000;

// 以綠界簽章涵蓋的付款時間判斷啟用範圍，避免重送舊通知時自動補開。
function paymentTime(value: string) {
  if (!/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return NaN;
  return Date.parse(value.replaceAll("/", "-").replace(" ", "T") + "+08:00");
}

export async function queueInvoice(
  tx: Prisma.TransactionClient,
  order: Order,
  charge: { mtn: string; period?: number; amount: number; chargedAt: string; subscriptionSku?: string },
) {
  const startAt = invoiceStartAt();
  if (!(startAt <= Date.now())) return;
  const paidAt = paymentTime(charge.chargedAt);
  if (paidAt < startAt) return;

  const environment = invoiceEnvironment();
  const prefix = environment === "production" ? "AV" : "AVTEST";
  const series = charge.period ? `P${String(charge.period).padStart(3, "0")}` : "S";
  const reference = `${prefix}${series}${charge.mtn}`;
  let items: { sku: string; qty: number }[] = [];
  try {
    items = JSON.parse(order.items);
    if (!Array.isArray(items)) items = [];
  } catch {
    // 舊訂單品項損壞時保留收款，交由後台確認發票資料。
  }
  const products = charge.subscriptionSku
    ? charge.subscriptionSku.split("+").map((sku) => ({ product: getProduct(sku), qty: 1 }))
    : items.map((item) => ({ product: getProduct(item?.sku), qty: item?.qty }))
      .filter(({ product }) => product?.type !== "monthly");
  const itemName = products.map(({ product, qty }) =>
    product ? `${product.i18n["zh-TW"].name}${qty > 1 ? ` × ${qty}` : ""}` : "",
  ).filter(Boolean).join("、");
  const manualReason = [
    !Number.isFinite(paidAt) && "付款通知缺有效的付款時間",
    (!itemName || products.some(({ product }) => !product)) && "需確認服務品項",
    !charge.period && products.some(({ product }) => product?.group === "promo") && "促銷席次保留金需會計確認",
    order.email.length > INVOICE_EMAIL_LIMIT && "發票 Email 超過綠界長度限制",
    order.taxId && (!validTaxId(order.taxId) || !order.company || order.company.length > INVOICE_COMPANY_LIMIT ||
      !order.invoiceAddress || order.invoiceAddress.length > INVOICE_ADDRESS_LIMIT) && "統編、公司抬頭或發票地址需確認",
    order.invoiceCarrier && !invoiceCarrierPattern.test(order.invoiceCarrier) && "載具格式需確認",
  ].filter(Boolean).join("、");

  await tx.invoice.upsert({
    where: { reference },
    update: {},
    create: {
      reference, orderId: order.id, environment, amount: charge.amount,
      itemName: itemName.slice(0, 500),
      status: manualReason ? "manual" : "pending",
      lastError: manualReason || null,
    },
  });
}

class ManualReview extends Error {}

async function issueInvoice(job: {
  reference: string; amount: number; itemName: string; attempts: number; order: Order;
}) {
  const { order, reference, amount, itemName } = job;
  if (job.attempts > 1) {
    const existing = await invoiceApi("GetIssue", { RelateNumber: reference });
    if (existing.RtnCode === 1) {
      if (existing.IIS_Relate_Number !== reference || Number(existing.IIS_Sales_Amount) !== amount ||
        String(existing.IIS_Issue_Status) !== "1" || String(existing.IIS_Invalid_Status) !== "0" ||
        typeof existing.IIS_Number !== "string" || !existing.IIS_Number) {
        throw new ManualReview("綠界已有同編號發票，請核對金額與狀態");
      }
      return {
        invoiceNo: existing.IIS_Number,
        invoiceDate: typeof existing.IIS_Create_Date === "string" ? existing.IIS_Create_Date : null,
      };
    }
    if (existing.RtnCode !== 2) throw new Error(`GetIssue RtnCode=${existing.RtnCode}`);
    // 查無資料時仍使用同一 RelateNumber，讓綠界阻擋重複開立。
  }

  const barcode = order.taxId ? "" : order.invoiceCarrier ?? "";
  if (barcode.startsWith("/") && invoiceEnvironment() === "production") {
    const checked = await invoiceApi("CheckBarcode", { BarCode: barcode }).catch(() => null);
    if (checked?.RtnCode === 1 && checked.IsExist === "N") {
      throw new ManualReview("手機條碼查無資料，請確認載具後開立");
    }
  }

  const corporate = Boolean(order.taxId);
  const result = await invoiceApi("Issue", {
    RelateNumber: reference,
    CustomerEmail: order.email,
    CustomerIdentifier: order.taxId ?? "",
    CustomerName: corporate ? order.company : "",
    CustomerAddr: corporate ? order.invoiceAddress : "",
    Print: corporate ? "1" : "0",
    Donation: "0",
    CarrierType: corporate ? "" : barcode ? (barcode.startsWith("/") ? "3" : "2") : "1",
    CarrierNum: barcode,
    TaxType: "1",
    SalesAmount: amount,
    InvType: "07",
    vat: "1",
    Items: [{ ItemSeq: 1, ItemName: itemName, ItemCount: 1, ItemWord: "式", ItemPrice: amount, ItemAmount: amount }],
  });
  if (result.RtnCode !== 1 || typeof result.InvoiceNo !== "string" || !result.InvoiceNo) {
    throw new Error(`Issue RtnCode=${result.RtnCode}`);
  }
  return {
    invoiceNo: result.InvoiceNo,
    invoiceDate: typeof result.InvoiceDate === "string" ? result.InvoiceDate : null,
  };
}

export async function runInvoiceQueue() {
  if (!(invoiceStartAt() <= Date.now())) return { enabled: false };
  invoiceCredentials();
  const where = { environment: invoiceEnvironment(), status: "pending", nextAttemptAt: { lte: new Date() } };
  const jobs = await prisma.invoice.findMany({ where, orderBy: { nextAttemptAt: "asc" }, take: 10, include: { order: true } });
  let issued = 0;
  let failed = 0;
  for (const job of jobs) {
    const attempts = job.attempts + 1;
    // 比對舊 attempts 取得處理權。程序中斷時租約到期，下一次會先向綠界查詢。
    const claim = await prisma.invoice.updateMany({
      where: { ...where, reference: job.reference, attempts: job.attempts },
      data: { attempts, nextAttemptAt: new Date(Date.now() + MINUTE) },
    });
    if (!claim.count) continue;
    const claimed = { reference: job.reference, attempts, status: "pending" };
    try {
      const invoice = await issueInvoice({ ...job, attempts });
      const saved = await prisma.invoice.updateMany({
        where: claimed,
        data: { ...invoice, status: "issued", lastError: null },
      });
      issued += saved.count;
    } catch (error) {
      failed++;
      const manual = error instanceof ManualReview || attempts >= MAX_ATTEMPTS;
      const message = error instanceof Error && /^(Issue |GetIssue |綠界已有|手機條碼)/.test(error.message)
        ? error.message : "發票 API 連線或回應異常";
      const saved = await prisma.invoice.updateMany({
        where: claimed,
        data: {
          status: manual ? "manual" : "pending", lastError: message,
          nextAttemptAt: new Date(Date.now() + MINUTE * 2 ** attempts),
        },
      });
      if (manual && saved.count) {
        await notifyOwner(
          `[Avalo] 發票需人工處理 ${job.orderId}`,
          `發票識別碼 ${job.reference}\n金額 NT$${job.amount}\n${message}\n請先在綠界查詢發票後再處理。`,
        );
      }
    }
  }
  return { enabled: true, issued, failed };
}
