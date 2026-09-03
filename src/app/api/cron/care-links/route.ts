import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";
import { sendCareAuthMail } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
// 首封授權信由後台「標記已上線」當下就寄出（見 lib/subscription.ts 的 markLaunched），
// 這支 cron 只負責跟催沒完成的人，所以從上線日起先留一天緩衝再開始寄。
const GRACE_HOURS = 24;
const STALE_DAYS = 30; // 上線日已過超過這麼多天則不再自動寄，改人工處理，避免騷擾陳年訂單
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

  // 待授權、已上線、未達提醒上限、且尚未寄或距上封已超過間隔。
  //
  // launchedAt 不可為 null 是這支 cron 最重要的一條：網站還沒上線就把授權連結寄出去，
  // 等於在客戶還沒拿到任何東西的時候開始收月費，正是這次改動要消滅的行為。
  //
  // 天數門檻改在 JS 算（見 authBasis）：待授權的訂閱本來就只有個位數，
  // 為了一個 max() 把條件塞進 SQL 只會讓它更難讀、也更容易再錯一次。
  const candidates = await prisma.subscription.findMany({
    where: {
      status: "pending",
      remindersSent: { lt: MAX_REMINDERS },
      launchedAt: { not: null },
      OR: [{ authLinkSentAt: null }, { authLinkSentAt: { lte: resendThreshold } }],
    },
    include: { order: { include: { payments: true } } },
  });
  const due = candidates.filter((s) => {
    const basis = authBasis(s).getTime();
    return basis <= graceThreshold.getTime() && basis >= staleThreshold.getTime();
  });

  const results: { orderId: string; sent: boolean; reason?: string }[] = [];
  for (const sub of due) {
    // 僅在建置一次性款項已付清後才寄維護授權連結。
    // 沒有一次性品項的訂單（單購維護、換方案後的新訂閱）視同已付，否則永遠追不到。
    if (!buildPaid(sub.order.payments)) {
      results.push({ orderId: sub.orderId, sent: false, reason: "build-unpaid" });
      continue;
    }

    const followUp = sub.remindersSent > 0; // 第二封為跟催
    const sent = await sendCareAuthMail(sub, sub.order, followUp);

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

  // 追完仍未授權 → 網站已交付但維護沒收到錢，這種狀態不該靜默。
  // 每筆只通知一次（escalatedAt），之後由人工接手。
  const stuck = (
    await prisma.subscription.findMany({
      where: {
        status: "pending",
        remindersSent: { gte: MAX_REMINDERS },
        escalatedAt: null,
        launchedAt: { not: null },
      },
      include: { order: { include: { payments: true } } },
    })
  ).filter((s) => buildPaid(s.order.payments) && authBasis(s) >= staleThreshold);

  for (const sub of stuck) {
    await notifyOwner(
      `[Avalo] ⚠️ 維護未授權需人工處理 — 訂單 ${sub.orderId}`,
      `網站已上線，已寄出 ${sub.remindersSent} 封授權連結仍未完成授權。\n\n` +
        `客戶：${sub.order.name} <${sub.order.email}>\n電話：${sub.order.phone}\n` +
        `方案：${sub.sku} NT$${sub.monthlyAmount}/月（含稅）\n` +
        `上線時間：${sub.launchedAt?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}\n\n` +
        `授權連結：${site}/api/pay/${sub.merchantTradeNo}\n` +
        `後續不會再自動寄信，請直接聯絡客戶。`
    );
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { escalatedAt: new Date() },
    });
  }

  return NextResponse.json({
    checked: due.length,
    sent: sentCount,
    escalated: stuck.length,
    results,
  });
}

/**
 * 這筆授權「是從哪一刻開始等的」——取上線日與訂閱建立時間的較晚者。
 *
 * 兩種情況需要不同的基準，用 max 一次涵蓋：
 * ・首次授權：startsAt 是下單日、launchedAt 是上線日，製作期可能長達數週，
 *   用 startsAt 會讓訂單一上線就被判定為「陳年訂單」而永遠不追。
 * ・換卡／換方案後的新訂閱：launchedAt 沿用原本的上線日（可能是半年前），
 *   用 launchedAt 會讓這筆一建立就超過 STALE_DAYS 而永遠不追。
 */
function authBasis(s: { startsAt: Date | null; launchedAt: Date | null }): Date {
  const started = s.startsAt?.getTime() ?? 0;
  const launched = s.launchedAt?.getTime() ?? 0;
  return new Date(Math.max(started, launched));
}

/** 訂單的建置款是否已付清；沒有一次性品項者視同已付 */
function buildPaid(payments: { kind: string; status: string }[]) {
  const onetime = payments.filter((p) => p.kind === "onetime");
  return onetime.length === 0 || onetime.every((p) => p.status === "paid");
}
