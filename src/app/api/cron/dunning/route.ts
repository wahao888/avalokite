import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyOwner, sendMail } from "@/lib/mail";
import { earlyExitFee, fmt, prepaidPeriodsFor } from "@/lib/products";
import { subscriptionUrl, fmtDate } from "@/lib/subscription";
import { tenantForOrder } from "@/lib/tenants";
import { SITE } from "@/lib/site";
import { daysUntilSuspension, dueDunningStage, MAX_DUNNING_STAGE } from "@/lib/dunning";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** 已攤提的期數＝定期定額扣成功的期數 ＋ 下單時保留金預付的期數 */
const paidPeriods = (sub: DunningSub) =>
  sub.totalSuccessTimes +
  prepaidPeriodsFor((JSON.parse(sub.order.items) as { sku: string }[]).map((i) => i.sku));

// ─── 欠費催收階梯 ───
//
// 為什麼需要階梯：綠界扣款失敗只會回一次通知，我們原本也只寄一封信就結束。
// 一封信＝沒有催收，客戶第 2 個月不付、第 3 個月照樣不付，而合約寫的
// 「逾期 15 日暫停、30 日終止」永遠不會發生——條款有、執行沒有，等於沒有。
//
// 為什麼 D+15 只通知而不自動暫停：把一個付費客戶的網站關掉是商務決定。
// 扣款失敗最常見的原因是卡片過期，不是賴帳；讓 cron 自動下線會把一次
// 換卡的小麻煩變成一次公開事故。系統負責準時提醒並附上指令，按下去的是人。
//
// 時程表與階段判斷在 lib/dunning.ts（純函式，有測試）。

// 由伺服器 cron 每日呼叫（帶 CRON_SECRET）。用 POST：此端點有副作用（寄信、改 DB）。
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://127.0.0.1:3000/api/cron/dunning
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await prisma.subscription.findMany({
    where: {
      status: "failed",
      pastDueSince: { not: null },
      dunningStage: { lt: MAX_DUNNING_STAGE },
    },
    include: { order: true },
  });

  const results: { orderId: string; stage: number; sent: boolean }[] = [];

  for (const sub of due) {
    const days = Math.floor((now - sub.pastDueSince!.getTime()) / DAY);
    const target = dueDunningStage(days, sub.dunningStage);
    if (target === 0) continue;

    const sent = await sendDunningMail(sub, target, days);
    // 寄失敗就不推進階段，隔天重試——階段推進了信沒寄出，客戶會在毫無預警下被暫停
    if (!sent) {
      results.push({ orderId: sub.orderId, stage: target, sent: false });
      continue;
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { dunningStage: target },
    });
    results.push({ orderId: sub.orderId, stage: target, sent: true });

    // D+15 與 D+30 是要站方動手的兩個節點，各自單獨寄一封可執行的通知
    if (target >= 3) await notifyOwnerAction(sub, target, days);
  }

  const acted = results.filter((r) => r.sent);
  if (acted.length > 0) {
    await notifyOwner(
      `[Avalo] 欠費催收：${acted.length} 筆推進階段`,
      acted.map((r) => `訂單 ${r.orderId} → 第 ${r.stage} 階`).join("\n")
    );
  }

  return NextResponse.json({ checked: due.length, acted: acted.length, results });
}

type DunningSub = Prisma.SubscriptionGetPayload<{ include: { order: true } }>;

/** 各階段寄給客戶的信。文案一路從「提醒」升到「已暫停／將終止」，語氣不繞圈子。 */
async function sendDunningMail(sub: DunningSub, stage: number, days: number) {
  const zh = sub.order.locale !== "en";
  const manageUrl = subscriptionUrl(sub.merchantTradeNo, sub.order.locale);
  const amount = fmt(sub.monthlyAmount);
  const since = fmtDate(sub.pastDueSince, zh);

  const zhBody: Record<number, { subject: string; text: string }> = {
    1: {
      subject: `[Avalo] 維護月費尚未完成扣款（訂單 ${sub.orderId}）`,
      text: `${sub.order.name} 您好，\n\n您的維護月費 NT$${amount}（含稅）自 ${since} 起尚未扣款成功，最常見的原因是信用卡到期、額度不足或已換卡。\n\n請點以下連結更新付款方式（我們會終止舊授權並請您重新授權一次，不會重複收費）：\n${manageUrl}\n\n網站與維護服務目前照常運作。\n\nAvalo 阿瓦羅`,
    },
    2: {
      subject: `[Avalo] 請盡快更新付款方式，逾期將暫停服務（訂單 ${sub.orderId}）`,
      text: `${sub.order.name} 您好，\n\n您的維護月費 NT$${amount}（含稅）自 ${since} 起仍未完成扣款，已逾期 ${days} 日。\n\n依服務條款第九條，自扣款失敗日起逾 15 日仍未完成付款者，本公司得暫停維護服務——屆時您的網站將暫停對外提供服務。距離該期限尚有 ${daysUntilSuspension(days)} 日。\n\n請點以下連結更新付款方式：\n${manageUrl}\n\n若付款有困難或想調整方案，請直接回覆本信，我們會盡量協助。\n\nAvalo 阿瓦羅`,
    },
    3: {
      subject: `[Avalo] 服務已暫停：維護月費逾期未付（訂單 ${sub.orderId}）`,
      text: `${sub.order.name} 您好，\n\n您的維護月費 NT$${amount}（含稅）自 ${since} 起未完成扣款，已逾期 ${days} 日。依服務條款第九條，我們已暫停您網站的對外服務。\n\n完成付款後我們會立即恢復，通常在一個工作日內：\n${manageUrl}\n\n您的資料完全保留，且隨時可從客戶後台匯出，不受暫停影響。\n\n自扣款失敗日起逾 30 日仍未完成付款者，本公司得終止契約。若有任何困難，請直接回覆本信與我們聯繫。\n\nAvalo 阿瓦羅`,
    },
    4: {
      subject: `[Avalo] 契約終止通知：維護月費逾期 ${days} 日（訂單 ${sub.orderId}）`,
      text: `${sub.order.name} 您好，\n\n您的維護月費自 ${since} 起未完成扣款，已逾期 ${days} 日。依服務條款第九條，本公司將終止本契約。\n\n後續處理：\n・資料匯出期間 30 日，期間內您仍可從客戶後台以 CSV 匯出全部資料\n・使用本公司子網域者，另免費保留 301 轉址 6 個月\n・${sub.commitEndsAt && sub.commitEndsAt > new Date() ? `您的方案仍在最短承諾期內，依條款須補付尚未攤完的建置費 NT$${fmt(earlyExitFee(paidPeriods(sub)))}（未稅）` : "您的方案已過最短承諾期，無須補付任何費用"}\n\n若您希望繼續服務，現在仍可完成付款恢復：\n${manageUrl}\n\n有任何問題請回覆本信或來信 ${SITE.email}。\n\nAvalo 阿瓦羅`,
    },
  };

  const enBody: Record<number, { subject: string; text: string }> = {
    1: {
      subject: `[Avalo] Your care payment hasn't gone through (order ${sub.orderId})`,
      text: `Hi ${sub.order.name},\n\nYour monthly care fee of NT$${amount} (incl. tax) hasn't been charged successfully since ${since} — usually an expired card, insufficient limit, or a replaced card.\n\nUpdate your payment method here (we cancel the old authorization and you authorize once more; you won't be charged twice):\n${manageUrl}\n\nYour site and care service continue as normal.\n\nAvalo`,
    },
    2: {
      subject: `[Avalo] Please update your card — service will be suspended (order ${sub.orderId})`,
      text: `Hi ${sub.order.name},\n\nYour monthly care fee of NT$${amount} (incl. tax) is still unpaid since ${since} — ${days} days overdue.\n\nUnder clause 9 of our terms, we may suspend service once a payment is 15 days overdue, which means your site stops serving visitors. That's ${daysUntilSuspension(days)} days away.\n\nUpdate your payment method here:\n${manageUrl}\n\nIf paying is difficult or you'd like to change plans, just reply to this email.\n\nAvalo`,
    },
    3: {
      subject: `[Avalo] Service suspended: care fee overdue (order ${sub.orderId})`,
      text: `Hi ${sub.order.name},\n\nYour monthly care fee of NT$${amount} (incl. tax) has been unpaid since ${since} — ${days} days overdue. Under clause 9 of our terms, your site has been suspended.\n\nWe restore service as soon as payment goes through, usually within one business day:\n${manageUrl}\n\nYour data is fully retained and can still be exported from your dashboard at any time.\n\nIf the payment is 30 days overdue we may terminate the contract. Please reply to this email if anything is getting in the way.\n\nAvalo`,
    },
    4: {
      subject: `[Avalo] Contract termination: care fee ${days} days overdue (order ${sub.orderId})`,
      text: `Hi ${sub.order.name},\n\nYour care fee has been unpaid since ${since} — ${days} days overdue. Under clause 9 of our terms, we are terminating this contract.\n\nWhat happens next:\n・A 30-day export window: you can still export all your data as CSV from your dashboard\n・On our subdomain, a free 301 redirect is kept for 6 months\n・${sub.commitEndsAt && sub.commitEndsAt > new Date() ? `Your plan is still within its minimum term, so the unamortized build fee of NT$${fmt(earlyExitFee(paidPeriods(sub)))} (pre-tax) is due` : "Your plan is past its minimum term, so nothing further is due"}\n\nIf you'd like to keep the service, you can still restore it by paying now:\n${manageUrl}\n\nQuestions? Reply here or email ${SITE.email}.\n\nAvalo`,
    },
  };

  const body = (zh ? zhBody : enBody)[stage];
  return sendMail({ to: sub.order.email, subject: body.subject, text: body.text });
}

/** D+15／D+30 要站方動手：把該做的事與確切指令一起寄出，不要只寄一句「請處理」 */
async function notifyOwnerAction(sub: DunningSub, stage: number, days: number) {
  const tenant = tenantForOrder(sub.orderId);
  const target = tenant
    ? `站台：${tenant.name}（slug ${tenant.slug}）`
    : `⚠️ 這張訂單沒有登錄對應的客戶站。請在 src/lib/tenants.ts 的該租戶加上 orderId: "${sub.orderId}"，之後這封信才報得出 slug。`;

  const howTo = tenant
    ? `暫停做法（改 .env 後重啟，兩秒生效、不必重新部署）：\n` +
      `  1. ssh -i avalo-studio.pem ubuntu@13.209.138.204\n` +
      `  2. sudo nano /opt/avalo/app/.env  → 把 ${tenant.slug} 加進 SUSPENDED_TENANTS（逗號分隔）\n` +
      `  3. sudo systemctl restart avalo\n` +
      `  恢復服務就是把 slug 從那一行移除，再 restart 一次。`
    : "";

  await notifyOwner(
    stage === 3
      ? `[Avalo] ⛔ 該暫停了：${sub.orderId} 欠費 ${days} 日`
      : `[Avalo] ⛔ 該終止了：${sub.orderId} 欠費 ${days} 日`,
    `客戶：${sub.order.name} <${sub.order.email}>\n電話：${sub.order.phone}\n` +
      `方案：${sub.sku} NT$${sub.monthlyAmount}/月（含稅）\n` +
      `首次扣款失敗：${fmtDate(sub.pastDueSince, true)}（已逾 ${days} 日）\n` +
      `已扣期數：${sub.totalSuccessTimes}\n` +
      `綁約：${sub.commitEndsAt ? `至 ${fmtDate(sub.commitEndsAt, true)}${sub.commitEndsAt > new Date() ? `（未到期，提前終止補償 NT$${fmt(earlyExitFee(paidPeriods(sub)))}）` : "（已期滿）"}` : "無"}\n\n` +
      `${target}\n\n` +
      (stage === 3
        ? `${howTo}\n\n客戶已收到「服務已暫停」的通知信。`
        : `客戶已收到終止通知信。請到 /admin 終止這筆定期定額授權，並安排 30 日資料匯出與 301 轉址。`)
  );
}
