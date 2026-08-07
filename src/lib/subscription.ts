import { prisma } from "@/lib/prisma";
import { cancelPeriod } from "@/lib/ecpay";
import { getProduct, withTax } from "@/lib/products";
import { notifyOwner, sendMail } from "@/lib/mail";
import { localePath } from "@/i18n/routing";

// 訂閱生命週期的單一入口：後台、客戶自助頁、排程都走這裡，
// 才不會有三份「終止＋重建」的邏輯各自漂移。
//
// 核心限制：綠界定期定額**不能改金額也不能換卡**。
// 因此「換方案」與「重新授權（換卡）」在系統裡是同一件事——
// 終止舊授權 → 開一筆新的 MerchantTradeNo → 請客戶重新授權。

/** 訂閱管理頁網址（mtn 本身即為存取憑證，同 /api/pay/[mtn] 的設計） */
export function subscriptionUrl(mtn: string, locale: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${site}${localePath(locale, `/subscription/${mtn}`)}`;
}

/**
 * 依訂單目前的付款重算狀態。
 *
 * 兩個容易寫錯的地方：
 * - cancelled 的付款（換方案作廢的舊授權）不列入計算，否則訂單永遠回不到 paid。
 * - 「還沒付」不等於「付失敗」。這支不只在綠界回傳時被呼叫，換方案時也會，
 *   那時全部款項都可能還是 pending——不能因此把訂單標成 failed。
 */
export async function recalcOrderStatus(orderId: string) {
  const payments = await prisma.payment.findMany({ where: { orderId } });
  const live = payments.filter((p) => p.status !== "cancelled");
  const paid = live.filter((p) => p.status === "paid").length;
  const failed = live.filter((p) => p.status === "failed").length;
  const status =
    live.length === 0
      ? "cancelled"
      : paid === live.length
        ? "paid"
        : failed > 0
          ? paid > 0
            ? "partial"
            : "failed"
          : paid > 0
            ? "partial"
            : "pending";
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}

/** 訂單下一個可用的綠界交易編號尾碼（1＝一次性、2＝首次授權，之後遞增） */
async function nextMerchantTradeNo(orderId: string) {
  const count = await prisma.payment.count({ where: { orderId } });
  return `${orderId}${count + 1}`;
}

/**
 * 終止綠界授權。訂閱還沒授權過（pending）時沒有東西可終止，直接跳過，
 * 避免拿一筆綠界根本不認得的交易編號去打 API 而得到誤導性的失敗。
 */
async function stopAtEcpay(sub: { merchantTradeNo: string; status: string }) {
  if (sub.status === "pending") {
    return { success: true, raw: "SKIPPED 尚未授權，無需終止", skipped: true };
  }
  const r = await cancelPeriod(sub.merchantTradeNo);
  return { success: r.success, raw: r.success ? r.raw : `FAIL ${r.rtnCode} ${r.rtnMsg}`, skipped: false };
}

export type SubWithOrder = Awaited<ReturnType<typeof findSubscription>>;

export function findSubscription(mtn: string) {
  return prisma.subscription.findUnique({
    where: { merchantTradeNo: mtn },
    include: { order: true },
  });
}

/**
 * 換方案／重新授權：終止舊授權，建立同一張訂單下的新訂閱與付款。
 * 承諾期沿用舊訂閱（換方案不重新起算綁約）。
 *
 * @returns 新的 MerchantTradeNo，呼叫端據此導向 /api/pay/{mtn} 完成授權
 */
export async function replaceSubscription(
  sub: NonNullable<SubWithOrder>,
  newSku: string,
  reason: "change" | "reauth"
): Promise<{ ok: true; mtn: string } | { ok: false; error: string }> {
  const product = getProduct(newSku);
  if (!product || product.type !== "monthly") return { ok: false, error: "bad-sku" };
  if (sub.status === "cancelled" || sub.status === "replaced") {
    return { ok: false, error: "already-ended" };
  }

  const stop = await stopAtEcpay(sub);
  // 綠界終止失敗就不繼續：否則會同時存在兩筆有效授權，客戶被扣兩次。
  if (!stop.success) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelResult: stop.raw.slice(0, 1000) },
    });
    return { ok: false, error: "ecpay-cancel-failed" };
  }

  const mtn = await nextMerchantTradeNo(sub.orderId);
  const amount = withTax(product.price);

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "replaced",
        cancelledAt: new Date(),
        cancelResult: `${reason.toUpperCase()} → ${mtn}｜${stop.raw}`.slice(0, 1000),
      },
    }),
    // 舊的授權付款作廢，否則訂單狀態永遠停在 partial
    prisma.payment.updateMany({
      where: { merchantTradeNo: sub.merchantTradeNo, status: { not: "paid" } },
      data: { status: "cancelled" },
    }),
    prisma.payment.create({
      data: { orderId: sub.orderId, merchantTradeNo: mtn, kind: "period", amount },
    }),
    prisma.subscription.create({
      data: {
        orderId: sub.orderId,
        merchantTradeNo: mtn,
        sku: newSku,
        monthlyAmount: amount,
        startsAt: new Date(),
        termMonths: sub.termMonths,
        commitEndsAt: sub.commitEndsAt,
        previousMtn: sub.merchantTradeNo,
      },
    }),
  ]);
  await recalcOrderStatus(sub.orderId);

  await notifyOwner(
    `[Avalo] 訂閱${reason === "change" ? "換方案" : "重新授權"} ${sub.orderId}`,
    `客戶：${sub.order.name} <${sub.order.email}>\n` +
      `原方案：${sub.sku} NT$${sub.monthlyAmount}/月（已終止）\n` +
      `新方案：${newSku} NT$${amount}/月（待客戶完成授權）\n` +
      `已扣期數：${sub.totalSuccessTimes}\n授權連結：${process.env.NEXT_PUBLIC_SITE_URL}/api/pay/${mtn}`
  );

  return { ok: true, mtn };
}

/** 終止訂閱（後台或客戶自助）。終止後綠界無法重啟，需重新下單。 */
export async function cancelSubscription(
  sub: NonNullable<SubWithOrder>,
  by: "admin" | "customer"
): Promise<{ ok: boolean; error?: string }> {
  if (sub.status === "cancelled") return { ok: true };

  const stop = await stopAtEcpay(sub);
  if (!stop.success) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelResult: stop.raw.slice(0, 1000) },
    });
    return { ok: false, error: "ecpay-cancel-failed" };
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelResult: `CANCEL(${by})｜${stop.raw}`.slice(0, 1000),
    },
  });
  await prisma.payment.updateMany({
    where: { merchantTradeNo: sub.merchantTradeNo, status: { not: "paid" } },
    data: { status: "cancelled" },
  });
  await recalcOrderStatus(sub.orderId);

  const zh = sub.order.locale !== "en";
  // 綁約未到期的取消要讓雙方都看得到，後續怎麼處理是商務判斷，系統不擋
  const commitNote =
    sub.commitEndsAt && sub.commitEndsAt > new Date()
      ? zh
        ? `\n\n※ 您的方案最短承諾期至 ${fmtDate(sub.commitEndsAt, true)}，我們會另行與您聯絡確認後續。`
        : `\n\n※ Your minimum term runs until ${fmtDate(sub.commitEndsAt, false)}; we'll contact you to confirm next steps.`
      : "";

  if (by === "customer") {
    await sendMail({
      to: sub.order.email,
      subject: zh
        ? `[Avalo] 維護訂閱已終止（訂單 ${sub.orderId}）`
        : `[Avalo] Your care subscription has been cancelled (order ${sub.orderId})`,
      text: zh
        ? `${sub.order.name} 您好，\n\n您訂單 ${sub.orderId} 的維護訂閱已終止，不會再有任何扣款。已扣款的當期服務仍提供至該期結束。\n\n終止後主機代管、備份、安全更新與監控將停止。若需要匯出表單資料或安排網站移交，請直接回覆本信。${commitNote}\n\nAvalo 阿瓦羅`
        : `Hi ${sub.order.name},\n\nThe care subscription on order ${sub.orderId} has been cancelled — no further charges will be made. The period you've already paid for runs to its end.\n\nHosting, backups, security updates and monitoring stop after that. Reply to this email if you need a data export or a site handover.${commitNote}\n\nAvalo`,
    });
  }
  await notifyOwner(
    `[Avalo] 訂閱終止（${by === "customer" ? "客戶自助" : "後台"}）${sub.orderId}`,
    `客戶：${sub.order.name} <${sub.order.email}>\n方案：${sub.sku} NT$${sub.monthlyAmount}/月\n` +
      `已扣期數：${sub.totalSuccessTimes}\n` +
      `綁約：${sub.commitEndsAt ? `至 ${fmtDate(sub.commitEndsAt, true)}${sub.commitEndsAt > new Date() ? "（未到期）" : ""}` : "無"}`
  );

  return { ok: true };
}

export function fmtDate(d: Date | string | null, zh: boolean) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(zh ? "zh-TW" : "en-US", { timeZone: "Asia/Taipei" });
}
