import { prisma } from "@/lib/prisma";
import { cancelPeriod } from "@/lib/ecpay";
import { getProduct, prepaidPeriodsFor, withTax } from "@/lib/products";
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

/**
 * 寄出「完成定期定額授權」的連結。首寄與跟催共用一份文案，
 * 才不會出現兩套說法（cron 說已上線、後台說待付款之類）。
 */
export async function sendCareAuthMail(
  sub: { merchantTradeNo: string; monthlyAmount: number; orderId: string },
  order: { email: string; name: string; locale: string },
  followUp: boolean
) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const zh = order.locale !== "en";
  const payUrl = `${site}/api/pay/${sub.merchantTradeNo}`;
  const amount = sub.monthlyAmount.toLocaleString();

  return sendMail({
    to: order.email,
    subject: zh
      ? `[Avalo] ${followUp ? "再次提醒：" : ""}網站已上線，請完成維護授權（訂單 ${sub.orderId}）`
      : `[Avalo] ${followUp ? "Reminder: " : ""}Your site is live — please authorize care (order ${sub.orderId})`,
    text: zh
      ? `${order.name} 您好，\n\n${followUp ? "先前寄給您的維護授權連結尚未完成，再次提醒。\n\n" : "您的網站已完成上線與驗收。\n\n"}依方案約定，維護月費自網站上線後起算。請點擊以下連結完成信用卡定期定額授權，每月自動扣款 NT$${amount}（含稅），可隨時取消：\n\n${payUrl}\n\n完成授權後，主機代管、備份、安全更新與監控會持續運作。\n\nAvalo 阿瓦羅`
      : `Hi ${order.name},\n\n${followUp ? "This is a follow-up — the care authorization link we sent hasn't been completed yet.\n\n" : "Your site is live and accepted.\n\n"}Care is billed from the day the site goes live. Complete the recurring card authorization below for NT$${amount} (incl. tax) per month, cancellable anytime:\n\n${payUrl}\n\nHosting, backups, security updates and monitoring keep running once it's authorized.\n\nAvalo`,
  });
}

/**
 * 標記網站已上線驗收 —— 含建置的訂單，月費的計時器是從這裡才開始走的。
 *
 * 一次做完三件事，刻意不拆開：漏掉任何一件都會產生「已上線但沒人收錢」或
 * 「開始收錢但承諾期算錯」的狀態，而這兩者都不會有人發現。
 *   1. 寫下 launchedAt（cron 追授權的基準，也是「月費從哪天算」的唯一依據）
 *   2. 以今天為起點寫下 commitEndsAt（條款第三條：承諾期自維護開始起算）
 *   3. 立刻寄授權連結，不必等隔天的 cron
 */
export async function markLaunched(
  sub: NonNullable<SubWithOrder>
): Promise<{ ok: true; mailed: boolean } | { ok: false; error: string }> {
  if (sub.launchedAt) return { ok: false, error: "already-launched" };
  if (sub.status !== "pending") return { ok: false, error: "not-pending" };

  // 一次性款項沒付清就標記上線，等於免費把站交出去又開始跑承諾期
  const payments = await prisma.payment.findMany({ where: { orderId: sub.orderId } });
  const onetime = payments.filter((p) => p.kind === "onetime");
  if (onetime.length > 0 && !onetime.every((p) => p.status === "paid")) {
    return { ok: false, error: "build-unpaid" };
  }

  const now = new Date();
  // 承諾期要扣掉「保留金已預付的期數」。綠界在授權當下就扣第一期，
  // 照 24 個月授權會扣滿 24 期，加上下單時的保留金就是 25 期——
  // 那樣保留金不但沒折抵，還變成多收一期。零元啟動的正解是：
  // 保留金＝第 1 期，上線後只再扣 23 期，總額仍是 2,000 × 24。
  const orderSkus = (JSON.parse(sub.order.items) as { sku: string }[]).map((i) => i.sku);
  const prepaid = prepaidPeriodsFor(orderSkus);
  const remainingMonths = sub.termMonths ? Math.max(1, sub.termMonths - prepaid) : null;
  const commitEndsAt = remainingMonths
    ? new Date(new Date(now).setMonth(now.getMonth() + remainingMonths))
    : null;

  const mailed = await sendCareAuthMail(sub, sub.order, false);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      launchedAt: now,
      commitEndsAt,
      // 寄失敗就別記次數，交給 cron 隔天重試（同 care-links 的處理）
      authLinkSentAt: mailed ? now : null,
      remindersSent: mailed ? 1 : 0,
    },
  });

  await notifyOwner(
    `[Avalo] 網站已上線，維護開始計費 ${sub.orderId}`,
    `客戶：${sub.order.name} <${sub.order.email}>\n` +
      `方案：${sub.sku} NT$${sub.monthlyAmount}/月（含稅）\n` +
      `上線日：${fmtDate(now, true)}\n` +
      `承諾期：${commitEndsAt ? `共 ${sub.termMonths} 期（保留金已付 ${prepaid} 期，尚須扣 ${remainingMonths} 期），至 ${fmtDate(commitEndsAt, true)}` : "無"}\n` +
      `授權連結${mailed ? "已寄給客戶" : "寄送失敗（cron 會重試）"}：${process.env.NEXT_PUBLIC_SITE_URL}/api/pay/${sub.merchantTradeNo}`
  );

  return { ok: true, mailed };
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
        // 上線日必須跟著搬過來。漏掉的話新訂閱看起來像「網站還沒上線」，
        // 會被 /api/pay 的未上線閘門擋成 409——而此時舊授權已經在綠界被終止了，
        // 客戶就卡在「舊的沒了、新的刷不了」而且自己救不回來。
        // 2026-09-03 換卡實測踩到過，換方案／換卡都走這條路徑。
        launchedAt: sub.launchedAt,
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
