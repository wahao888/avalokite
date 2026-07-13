import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, notifyOwner } from "@/lib/mail";

export const dynamic = "force-dynamic";

// 建置含首月維護：於維護起扣日前這麼多天，寄授權連結給客戶（兼具「首月即將到期」提醒）
const LEAD_DAYS = 5;

// 由伺服器 cron 每日呼叫（帶 CRON_SECRET）：
//   curl -fsS -H "x-cron-secret: $CRON_SECRET" http://127.0.0.1:3000/api/cron/care-links
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const threshold = new Date(Date.now() + LEAD_DAYS * 24 * 60 * 60 * 1000);

  // 待授權、尚未寄過連結、且起扣日已進入通知窗內的維護訂閱
  const due = await prisma.subscription.findMany({
    where: {
      status: "pending",
      authLinkSentAt: null,
      startsAt: { not: null, lte: threshold },
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
    const payUrl = `${site}/api/pay/${sub.merchantTradeNo}`;
    const amount = sub.monthlyAmount.toLocaleString();
    const endDate = sub.startsAt
      ? new Date(sub.startsAt).toLocaleDateString(zh ? "zh-TW" : "en-US", {
          timeZone: "Asia/Taipei",
        })
      : "";

    const sent = await sendMail({
      to: sub.order.email,
      subject: zh
        ? `[Avalo] 維護首月即將結束，續約請授權（訂單 ${sub.orderId}）`
        : `[Avalo] Your first month of care is ending — authorize to continue (order ${sub.orderId})`,
      text: zh
        ? `${sub.order.name} 您好，\n\n您訂單 ${sub.orderId} 內含的第一個月維護即將於 ${endDate} 結束。\n若要持續由 Avalo 為您維護，請點擊以下連結完成信用卡定期定額授權，第二個月起每月自動扣款 NT$${amount}（含稅），可隨時取消：\n\n${payUrl}\n\n若暫不續約，可忽略本信，維護將自然結束。\n\nAvalo 阿瓦羅`
        : `Hi ${sub.order.name},\n\nThe first month of care included with order ${sub.orderId} ends on ${endDate}.\nTo keep Avalo maintaining your site, complete the recurring card authorization below. Billing of NT$${amount} (incl. tax) starts from month two and can be cancelled anytime:\n\n${payUrl}\n\nIf you'd rather not continue, ignore this email and care will simply end.\n\nAvalo`,
    });

    // 只有真的寄出才標記，SMTP 未設定／寄信失敗時保持 pending，隔天重試
    if (!sent) {
      results.push({ orderId: sub.orderId, sent: false, reason: "mail-skipped" });
      continue;
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { authLinkSentAt: new Date() },
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
