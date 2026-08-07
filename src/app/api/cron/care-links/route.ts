import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, notifyOwner } from "@/lib/mail";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
// 維護自第一個月起計費，正常路徑是客戶在建置付款成功頁直接完成授權。
// 這支 cron 只負責追回「中離未授權」的訂單，故先留一天緩衝再開始寄。
const GRACE_HOURS = 24;
const STALE_DAYS = 30; // 起扣日已過超過這麼多天則不再自動寄，改人工處理，避免騷擾陳年訂單
const RESEND_GAP_DAYS = 5; // 兩封提醒之間的間隔
const MAX_REMINDERS = 2; // 最多寄幾封（首封 + 一次跟催）

// 由伺服器 cron 每日呼叫（帶 CRON_SECRET）。用 POST：此端點有副作用（寄信、改 DB），
// 避免預抓／爬蟲以 GET 誤觸。
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://127.0.0.1:3000/api/cron/care-links
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = Date.now();
  const graceThreshold = new Date(now - GRACE_HOURS * 60 * 60 * 1000);
  const staleThreshold = new Date(now - STALE_DAYS * DAY);
  const resendThreshold = new Date(now - RESEND_GAP_DAYS * DAY);

  // 待授權、未達提醒上限、已過緩衝期（且未過期太久）、且尚未寄或距上封已超過間隔
  const due = await prisma.subscription.findMany({
    where: {
      status: "pending",
      remindersSent: { lt: MAX_REMINDERS },
      startsAt: { lte: graceThreshold, gte: staleThreshold },
      OR: [{ authLinkSentAt: null }, { authLinkSentAt: { lte: resendThreshold } }],
    },
    include: { order: { include: { payments: true } } },
  });

  const results: { orderId: string; sent: boolean; reason?: string }[] = [];
  for (const sub of due) {
    // 僅在建置一次性款項已付清後才寄維護授權連結
    const buildPaid = sub.order.payments.some(
      (p) => p.kind === "onetime" && p.status === "paid"
    );
    if (!buildPaid) {
      results.push({ orderId: sub.orderId, sent: false, reason: "build-unpaid" });
      continue;
    }

    const zh = sub.order.locale !== "en";
    const followUp = sub.remindersSent > 0; // 第二封為跟催
    const payUrl = `${site}/api/pay/${sub.merchantTradeNo}`;
    const amount = sub.monthlyAmount.toLocaleString();

    const sent = await sendMail({
      to: sub.order.email,
      subject: zh
        ? `[Avalo] ${followUp ? "再次提醒：" : ""}維護方案尚未完成授權（訂單 ${sub.orderId}）`
        : `[Avalo] ${followUp ? "Reminder: " : ""}Your care plan isn't authorized yet (order ${sub.orderId})`,
      text: zh
        ? `${sub.order.name} 您好，\n\n${followUp ? "先前寄給您的維護授權連結尚未完成，再次提醒。\n\n" : ""}您訂單 ${sub.orderId} 的建置款項已收到，但方案內含的維護尚未完成信用卡定期定額授權。\n維護自第一個月起計費，請點擊以下連結完成授權，每月自動扣款 NT$${amount}（含稅），可隨時取消：\n\n${payUrl}\n\n完成授權後，主機代管、備份、安全更新與監控才會正式啟動。\n\nAvalo 阿瓦羅`
        : `Hi ${sub.order.name},\n\n${followUp ? "This is a follow-up — the care authorization link we sent hasn't been completed yet.\n\n" : ""}We've received the build payment for order ${sub.orderId}, but the care plan included in it still needs a recurring card authorization.\nCare is billed from month one. Complete the authorization below for NT$${amount} (incl. tax) per month, cancellable anytime:\n\n${payUrl}\n\nHosting, backups, security updates and monitoring start once it's authorized.\n\nAvalo`,
    });

    // 只有真的寄出才計數，SMTP 未設定／寄信失敗時保持原狀，隔天重試
    if (!sent) {
      results.push({ orderId: sub.orderId, sent: false, reason: "mail-skipped" });
      continue;
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { authLinkSentAt: new Date(), remindersSent: sub.remindersSent + 1 },
    });
    results.push({ orderId: sub.orderId, sent: true });
  }

  const sentCount = results.filter((r) => r.sent).length;
  if (sentCount > 0) {
    await notifyOwner(
      `[Avalo] 已寄出 ${sentCount} 封維護授權連結`,
      results
        .filter((r) => r.sent)
        .map((r) => `訂單 ${r.orderId}`)
        .join("\n")
    );
  }

  return NextResponse.json({ checked: due.length, sent: sentCount, results });
}
