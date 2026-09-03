import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { genOrderId } from "@/lib/ecpay";
import {
  BUILD_COMMIT_MONTHS,
  careOptionsFor,
  careRequired,
  getProduct,
  mixedBuildConflict,
  promoCareNeedsBuild,
  promoPlanForSkus,
  withTax,
} from "@/lib/products";
import { notifyOwner } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { LEGAL_VERSION } from "@/lib/legal-content";
import { consentRecord } from "@/lib/legal-consent";

// 每筆結帳都會寫入 Order＋Payment（＋Subscription）。沒有限流的話，
// 通用 /api/ 的 5r/s 等於每天可灌 43 萬筆進 SQLite。
// 10 次/10 分鐘對真實購買者（含改單重送）綽綽有餘。
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(50),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{8}$/)
    .optional()
    .or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  locale: z.string().max(10).optional(),
  // 契約同意：勾選值與客戶當下看到的條款版本
  agree: z.literal("yes"),
  termsVersion: z.string().max(20),
  items: z
    .array(z.object({ sku: z.string().max(50), qty: z.number().int().min(1).max(9) }))
    .min(1)
    .max(20),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`checkout:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  // 客戶看到的條款版本與現行版不符（結帳中途剛好部署了新版）→ 不默默用新版成立契約，
  // 請對方重新確認。這種情況罕見，但它正是留證機制存在的理由。
  if (d.termsVersion !== LEGAL_VERSION) {
    return NextResponse.json(
      { error: "terms updated", termsVersion: LEGAL_VERSION },
      { status: 409 }
    );
  }

  // 價格一律以伺服器端目錄為準，不信任前端
  let oneTimeTotal = 0;
  let monthlyTotal = 0;
  const monthlySkus: string[] = [];
  for (const item of d.items) {
    const p = getProduct(item.sku);
    if (!p) return NextResponse.json({ error: `unknown sku ${item.sku}` }, { status: 400 });
    if (p.type === "onetime") {
      oneTimeTotal += p.price * item.qty;
    } else {
      monthlyTotal += p.price; // 月費品項固定 1 份
      monthlySkus.push(p.sku);
    }
  }
  if (oneTimeTotal === 0 && monthlyTotal === 0) {
    return NextResponse.json({ error: "empty order" }, { status: 400 });
  }
  // 建置案必須搭配維護（購物車已擋，此處為伺服器端再驗一次，防繞過前端）
  const skus = d.items.map((i) => i.sku);
  // 促銷建置與正式建置同車會讓正式方案吃到促銷維護價，直接擋掉
  if (mixedBuildConflict(skus)) {
    return NextResponse.json({ error: "promo and standard builds cannot be mixed" }, { status: 400 });
  }
  if (careRequired(skus)) {
    const options = careOptionsFor(skus).map((p) => p.sku);
    if (!monthlySkus.some((s) => options.includes(s))) {
      return NextResponse.json({ error: "care plan required" }, { status: 400 });
    }
  }
  // 促銷維護單獨結帳＝用促銷價買到沒有綁約的維護，擋掉（見 promoCareNeedsBuild）
  if (promoCareNeedsBuild(skus)) {
    return NextResponse.json({ error: "promo care requires the promo build" }, { status: 400 });
  }
  // 有建置＝先付一次性款項，網站上線驗收後才寄維護授權連結；
  // 無建置＝單購維護（既有網站），服務當下就在提供，結帳當下即授權。
  const hasBuild = oneTimeTotal > 0;

  const orderId = genOrderId();
  const order = await prisma.order.create({
    data: {
      id: orderId,
      email: d.email,
      name: d.name,
      phone: d.phone,
      company: d.company || null,
      taxId: d.taxId || null,
      note: d.note || null,
      locale: d.locale ?? "zh-TW",
      items: JSON.stringify(d.items),
      // 同意紀錄：雜湊以伺服器自己的條款內容計算，不採信前端傳來的值
      ...consentRecord(d.locale ?? "zh-TW", clientIp(req)),
      oneTimeTotal,
      monthlyTotal,
    },
  });

  // 一次性款項 → MTN 尾碼 1；定期定額授權 → 尾碼 2
  if (oneTimeTotal > 0) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        merchantTradeNo: `${orderId}1`,
        kind: "onetime",
        amount: withTax(oneTimeTotal),
      },
    });
  }
  if (monthlyTotal > 0) {
    const mtn = `${orderId}2`;
    await prisma.payment.create({
      data: {
        orderId: order.id,
        merchantTradeNo: mtn,
        kind: "period",
        amount: withTax(monthlyTotal),
      },
    });
    // 最短承諾期寫進訂閱紀錄，日後要判斷提前解約或「滿 24 個月免費移交原始碼」
    // 才有依據，不必翻合約。促銷方案有自己的承諾期，其餘含建置的訂單一律 12 個月，
    // 單購維護則不綁約。
    const promo = promoPlanForSkus(skus);
    const termMonths = promo?.termMonths ?? (careRequired(skus) ? BUILD_COMMIT_MONTHS : null);

    // 含建置的訂單，承諾期與 launchedAt 一起在「標記已上線」時才寫入
    //（見 lib/subscription.ts 的 markLaunched）。這裡先留 null 是刻意的：
    // 條款第三條說承諾期自維護首次扣款日起算，而首次扣款要到上線之後才會發生，
    // 在結帳當下就把 24 個月定下來，等於把製作期算進客戶買的服務裡。
    const commitEndsAt =
      !hasBuild && termMonths
        ? new Date(new Date().setMonth(new Date().getMonth() + termMonths))
        : null;

    await prisma.subscription.create({
      data: {
        orderId: order.id,
        merchantTradeNo: mtn,
        sku: monthlySkus.join("+"),
        monthlyAmount: withTax(monthlyTotal),
        startsAt: new Date(),
        termMonths,
        commitEndsAt,
        // 單購維護當下即授權，不需追；含建置者等站方標記上線後才由 cron 寄連結
        launchedAt: hasBuild ? null : new Date(),
        authLinkSentAt: hasBuild ? null : new Date(),
        remindersSent: hasBuild ? 0 : 2,
      },
    });
  }

  // 維護採定期定額，首期於授權當下即扣；含建置者要到網站上線驗收後才授權。
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const careNote =
    monthlyTotal > 0
      ? hasBuild
        ? `\n\n【維護訂閱】NT$${monthlyTotal}/月（未稅）— 尚未起算\n★ 網站上線驗收後，請到後台訂閱列按「標記已上線」：系統才會寄出定期定額授權連結、並自該日起算承諾期。\n在那之前不會向客戶收取任何月費。`
        : `\n\n【維護訂閱】NT$${monthlyTotal}/月（未稅）\n單購維護，客戶於結帳當下即完成定期定額授權、當月起扣，無需另寄連結。`
      : "";
  await notifyOwner(
    `[Avalo] 新訂單 ${orderId} — ${d.name}`,
    `一次性：NT$${oneTimeTotal}（未稅）\nEmail：${d.email}\n電話：${d.phone}${careNote}` +
      `\n\n【同意紀錄】條款 ${order.agreedTermsVersion}（${order.agreedTermsHash}）` +
      `\n同意時間：${order.agreedAt?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}　IP：${order.agreedIp}`
  );

  // 結帳只導向一次性付款；維護授權連結另行寄送（見上方店主通知）
  const firstMtn = oneTimeTotal > 0 ? `${orderId}1` : `${orderId}2`;
  return NextResponse.json({ orderId, payUrl: `/api/pay/${firstMtn}` });
}
