import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { genOrderId } from "@/lib/ecpay";
import {
  careOptionsFor,
  careRequired,
  getProduct,
  mixedBuildConflict,
  promoPlanForSkus,
  withTax,
} from "@/lib/products";
import { notifyOwner } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";

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
  // 有建置＝先付建置款，付款成功後於結果頁接著完成維護授權；無建置＝單購維護，當下即授權
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
    // 促銷方案有最短承諾期（創始價 12 個月／零元啟動 24 個月），寫進訂閱紀錄，
    // 日後要判斷提前解約或「滿 24 個月免費移交原始碼」才有依據，不必翻合約。
    const promo = promoPlanForSkus(skus);
    const commitEndsAt = promo
      ? new Date(new Date().setMonth(new Date().getMonth() + promo.termMonths))
      : null;

    // 維護自第一個月起計費，兩種路徑都是「當下授權、首期即時扣」：
    // 有建置 → 建置付款成功後，結果頁接著引導完成維護授權；
    // 單購維護 → 結帳當下直接導向授權。
    await prisma.subscription.create({
      data: {
        orderId: order.id,
        merchantTradeNo: mtn,
        sku: monthlySkus.join("+"),
        monthlyAmount: withTax(monthlyTotal),
        startsAt: new Date(),
        termMonths: promo?.termMonths ?? null,
        commitEndsAt,
        // 有建置者若在結果頁中離未授權，交由 cron 寄連結追回；單購維護當下即授權，不需追
        authLinkSentAt: hasBuild ? null : new Date(),
        remindersSent: hasBuild ? 0 : 2,
      },
    });
  }

  // 維護採定期定額，首期於授權當下即扣，自第一個月起計費。
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const careNote =
    monthlyTotal > 0
      ? hasBuild
        ? `\n\n【維護訂閱】NT$${monthlyTotal}/月（未稅）\n建置付款成功後，結果頁會引導客戶完成定期定額授權（第一期即時扣）。若客戶中離未授權，cron 會自動寄授權連結追回；連結為：\n${site}/api/pay/${orderId}2`
        : `\n\n【維護訂閱】NT$${monthlyTotal}/月（未稅）\n單購維護，客戶於結帳當下即完成定期定額授權、當月起扣，無需另寄連結。`
      : "";
  await notifyOwner(
    `[Avalo] 新訂單 ${orderId} — ${d.name}`,
    `一次性：NT$${oneTimeTotal}（未稅）\nEmail：${d.email}\n電話：${d.phone}${careNote}`
  );

  // 結帳只導向一次性付款；維護授權連結另行寄送（見上方店主通知）
  const firstMtn = oneTimeTotal > 0 ? `${orderId}1` : `${orderId}2`;
  return NextResponse.json({ orderId, payUrl: `/api/pay/${firstMtn}` });
}
