import { prisma } from "@/lib/prisma";
import { verifyCheckMac } from "@/lib/ecpay";
import { notifyOwner, sendMail } from "@/lib/mail";

export async function formToParams(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => {
    params[k] = v;
  });
  return params;
}

// 處理一次性付款／定期定額「首次授權」結果（ReturnURL 與 OrderResultURL 共用）
export async function processPaymentResult(params: Record<string, string>) {
  if (!verifyCheckMac(params)) {
    throw new Error("CheckMacValue mismatch");
  }
  const mtn = params.MerchantTradeNo;
  const success = params.RtnCode === "1";

  const payment = await prisma.payment.findUnique({
    where: { merchantTradeNo: mtn },
    include: { order: true },
  });
  if (!payment) throw new Error(`payment not found: ${mtn}`);

  // 已處理過（ReturnURL 與 client return 都會打）→ 冪等
  if (payment.status === "paid") return payment.order.id;

  await prisma.payment.update({
    where: { merchantTradeNo: mtn },
    data: {
      status: success ? "paid" : "failed",
      ecpayTradeNo: params.TradeNo ?? null,
      paymentType: params.PaymentType ?? null,
      paidAt: success ? new Date() : null,
      rawReturn: JSON.stringify(params),
    },
  });

  if (payment.kind === "period") {
    await prisma.subscription.updateMany({
      where: { merchantTradeNo: mtn },
      data: {
        status: success ? "active" : "failed",
        gwsr: params.Gwsr ?? params.gwsr ?? null,
        totalSuccessTimes: success ? 1 : 0,
        lastChargeAt: success ? new Date() : null,
        rawReturn: JSON.stringify(params),
      },
    });
  }

  // 重算訂單狀態
  const payments = await prisma.payment.findMany({ where: { orderId: payment.orderId } });
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const status =
    paidCount === payments.length ? "paid" : paidCount > 0 ? "partial" : "failed";
  const order = await prisma.order.update({
    where: { id: payment.orderId },
    data: { status },
  });

  if (success) {
    const zh = order.locale !== "en";
    await sendMail({
      to: order.email,
      subject: zh
        ? `[Avalo] 訂單 ${order.id} 付款成功`
        : `[Avalo] Order ${order.id} payment confirmed`,
      text: zh
        ? `${order.name} 您好，\n\n您的訂單 ${order.id} 已收到款項 NT$${payment.amount}（含稅）。\n我會在 24 小時內與您聯絡，開始需求訪談。\n\n訂單查詢：${process.env.NEXT_PUBLIC_SITE_URL}/order/lookup\n\nAvalo 阿瓦羅`
        : `Hi ${order.name},\n\nPayment of NT$${payment.amount} (incl. tax) for order ${order.id} is confirmed.\nI'll reach out within 24 hours to start the discovery call.\n\nOrder lookup: ${process.env.NEXT_PUBLIC_SITE_URL}/order/lookup\n\nAvalo`,
    });
    await notifyOwner(
      `[Avalo] 收款成功 ${order.id}（${payment.kind}）NT$${payment.amount}`,
      `客戶：${order.name} <${order.email}>\n電話：${order.phone}`
    );
  }
  return order.id;
}

// 定期定額每期扣款通知（PeriodReturnURL）
export async function processPeriodCharge(params: Record<string, string>) {
  if (!verifyCheckMac(params)) {
    throw new Error("CheckMacValue mismatch");
  }
  const mtn = params.MerchantTradeNo;
  const success = params.RtnCode === "1";
  const sub = await prisma.subscription.findUnique({
    where: { merchantTradeNo: mtn },
    include: { order: true },
  });
  if (!sub) throw new Error(`subscription not found: ${mtn}`);

  await prisma.subscription.update({
    where: { merchantTradeNo: mtn },
    data: success
      ? {
          status: "active",
          totalSuccessTimes: Number(params.TotalSuccessTimes ?? sub.totalSuccessTimes + 1),
          lastChargeAt: new Date(),
          gwsr: params.Gwsr ?? params.gwsr ?? sub.gwsr,
          rawReturn: JSON.stringify(params),
        }
      : { status: "failed", rawReturn: JSON.stringify(params) },
  });

  await notifyOwner(
    `[Avalo] 訂閱扣款${success ? "成功" : "失敗"} ${sub.orderId} NT$${sub.monthlyAmount}`,
    `客戶：${sub.order.name} <${sub.order.email}>\n累計成功期數：${params.TotalSuccessTimes ?? "?"}`
  );
}
