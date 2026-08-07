import { prisma } from "@/lib/prisma";
import { verifyCheckMac } from "@/lib/ecpay";
import { notifyOwner, sendMail } from "@/lib/mail";
import { recalcOrderStatus, subscriptionUrl } from "@/lib/subscription";
import { getProduct } from "@/lib/products";

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

  const order = await recalcOrderStatus(payment.orderId);

  if (success) {
    const zh = order.locale !== "en";
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    // 建置付款成功、且訂單含維護訂閱 → 提醒還有一步：維護的定期定額授權（自第一個月起計費）
    const careHeadsUp =
      payment.kind === "onetime" && order.monthlyTotal > 0
        ? zh
          ? `\n\n※ 還有一步：您的方案含維護，維護自第一個月起計費，需另外完成信用卡定期定額授權（與本次建置款項是兩筆分開的授權）。付款完成頁面上即有授權按鈕；若已關閉頁面，我們會另寄授權連結給您。`
          : `\n\n※ One more step: your plan includes care, billed from month one via a separate recurring card authorization (separate from this build payment). The button is on the payment result page — if you've closed it, we'll email you the link.`
        : "";
    // 定期定額首期於授權當下即扣，信件要講清楚「已扣第一期」而不是含糊的「付款成功」
    const isPeriod = payment.kind === "period";
    // 契約留證：把客戶同意的版本寫進確認信，客戶手上就有一份可對照的副本，
    // 而不是只有我們單方面的資料庫紀錄。
    const termsLine = order.agreedTermsVersion
      ? zh
        ? `\n\n本訂單適用您於下單時同意的條款版本 ${order.agreedTermsVersion}（識別碼 ${order.agreedTermsHash}）：\n${site}/legal/terms?v=${order.agreedTermsVersion}\n日後條款如有修訂，不影響本訂單。`
        : `\n\nThis order is governed by the terms version you accepted at checkout, ${order.agreedTermsVersion} (id ${order.agreedTermsHash}):\n${site}/en/legal/terms?v=${order.agreedTermsVersion}\nLater revisions do not affect this order.`
      : "";
    await sendMail({
      to: order.email,
      subject: isPeriod
        ? zh
          ? `[Avalo] 維護訂閱已啟用（訂單 ${order.id}）`
          : `[Avalo] Your care subscription is active (order ${order.id})`
        : zh
          ? `[Avalo] 訂單 ${order.id} 付款成功`
          : `[Avalo] Order ${order.id} payment confirmed`,
      text: isPeriod
        ? zh
          ? `${order.name} 您好，\n\n您訂單 ${order.id} 的維護訂閱已完成信用卡定期定額授權，第一期 NT$${payment.amount}（含稅）已扣款，之後每月自動扣款。\n\n管理訂閱（換方案、更換信用卡、終止扣款）：\n${subscriptionUrl(mtn, order.locale)}\n\nAvalo 阿瓦羅`
          : `Hi ${order.name},\n\nThe recurring card authorization for order ${order.id} is complete. The first charge of NT$${payment.amount} (incl. tax) has been made, and billing continues monthly.\n\nManage your subscription (change plan, update card, cancel):\n${subscriptionUrl(mtn, order.locale)}\n\nAvalo`
        : zh
          ? `${order.name} 您好，\n\n您的訂單 ${order.id} 已收到款項 NT$${payment.amount}（含稅）。\n專案顧問將在 24 小時內與您聯絡，開始需求訪談。${careHeadsUp}${termsLine}\n\n訂單查詢：${site}/order/lookup\n\nAvalo 阿瓦羅`
          : `Hi ${order.name},\n\nPayment of NT$${payment.amount} (incl. tax) for order ${order.id} is confirmed.\nA project consultant will reach out within 24 hours to start the discovery call.${careHeadsUp}${termsLine}\n\nOrder lookup: ${site}/order/lookup\n\nAvalo`,
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

  const times = Number(params.TotalSuccessTimes ?? sub.totalSuccessTimes + 1);
  await prisma.subscription.update({
    where: { merchantTradeNo: mtn },
    data: success
      ? {
          status: "active",
          totalSuccessTimes: times,
          lastChargeAt: new Date(),
          gwsr: params.Gwsr ?? params.gwsr ?? sub.gwsr,
          rawReturn: JSON.stringify(params),
        }
      : { status: "failed", rawReturn: JSON.stringify(params) },
  });

  // 每期都要讓客戶收到憑據。訂閱制最怕的是客戶在信用卡帳單上看到一筆
  // 認不出來的「綠界」扣款——那通常直接變成爭議請款或退訂。
  const zh = sub.order.locale !== "en";
  const manageUrl = subscriptionUrl(mtn, sub.order.locale);
  const planName = sub.sku
    .split("+")
    .map((s) => getProduct(s)?.i18n[zh ? "zh-TW" : "en"].name ?? s)
    .join(" + ");

  if (success) {
    await sendMail({
      to: sub.order.email,
      subject: zh
        ? `[Avalo] 維護月費扣款成功 NT$${sub.monthlyAmount}（訂單 ${sub.orderId}）`
        : `[Avalo] Care subscription charged NT$${sub.monthlyAmount} (order ${sub.orderId})`,
      text: zh
        ? `${sub.order.name} 您好，\n\n本期維護月費已完成扣款。\n\n方案：${planName}\n金額：NT$${sub.monthlyAmount}（含稅）\n期數：第 ${times} 期\n訂單：${sub.orderId}\n\n管理訂閱（換方案、更換信用卡、終止扣款）：\n${manageUrl}\n\nAvalo 阿瓦羅`
        : `Hi ${sub.order.name},\n\nThis month's care subscription has been charged.\n\nPlan: ${planName}\nAmount: NT$${sub.monthlyAmount} (incl. tax)\nPeriod: #${times}\nOrder: ${sub.orderId}\n\nManage your subscription (change plan, update card, cancel):\n${manageUrl}\n\nAvalo`,
    });
  } else {
    // 扣款失敗最常見的原因是卡片到期或被換掉。綠界定期定額無法換卡，
    // 只能終止舊授權後重新授權——管理頁的「更換信用卡」就是做這件事。
    await sendMail({
      to: sub.order.email,
      subject: zh
        ? `[Avalo] 維護月費扣款失敗，請更新付款方式（訂單 ${sub.orderId}）`
        : `[Avalo] Care subscription payment failed — please update your card (order ${sub.orderId})`,
      text: zh
        ? `${sub.order.name} 您好，\n\n本期維護月費 NT$${sub.monthlyAmount}（含稅）扣款失敗，最常見的原因是信用卡到期、額度不足或已換卡。\n\n請點以下連結更新付款方式，我們會終止舊授權並請您重新授權一次（不會重複收費）：\n${manageUrl}\n\n維護服務會先照常運作，若持續無法扣款我們會另行與您聯絡。\n\nAvalo 阿瓦羅`
        : `Hi ${sub.order.name},\n\nThis month's care charge of NT$${sub.monthlyAmount} (incl. tax) failed — usually an expired card, insufficient limit, or a replaced card.\n\nUpdate your payment method here; we'll cancel the old authorization and ask you to authorize once more (you won't be charged twice):\n${manageUrl}\n\nYour service continues for now. If the charge keeps failing we'll be in touch.\n\nAvalo`,
    });
  }

  await notifyOwner(
    `[Avalo] 訂閱扣款${success ? "成功" : "失敗"} ${sub.orderId} NT$${sub.monthlyAmount}`,
    `客戶：${sub.order.name} <${sub.order.email}>\n方案：${planName}\n累計成功期數：${params.TotalSuccessTimes ?? "?"}` +
      (success ? "" : `\n\n已寄出「更新付款方式」信，客戶可自助重新授權：${manageUrl}`)
  );
}
