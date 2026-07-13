import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { genOrderId } from "@/lib/ecpay";
import { getProduct, withTax } from "@/lib/products";
import { notifyOwner } from "@/lib/mail";

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
    // 建置已含首月 → 維護自訂單 +30 天起扣（授權連結由 cron 於接近時寄出）；
    // 單購維護（無建置）→ 當下即需授權並開始扣款。
    const hasBuild = oneTimeTotal > 0;
    const startsAt = hasBuild
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date();
    await prisma.subscription.create({
      data: {
        orderId: order.id,
        merchantTradeNo: mtn,
        sku: monthlySkus.join("+"),
        monthlyAmount: withTax(monthlyTotal),
        startsAt,
        // 單購維護於結帳當下即導向授權，視為已寄連結，不再由 cron 重複寄
        authLinkSentAt: hasBuild ? null : new Date(),
      },
    });
  }

  // 維護採定期定額，首期於授權當下即扣。為對應「建置已含首月」，
  // 維護授權連結不在結帳當下要求，而是於首月結束前寄給客戶，使首期落在第二個月。
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const careNote =
    monthlyTotal > 0
      ? `\n\n【維護訂閱】NT$${monthlyTotal}/月（未稅）\n首月已含於建置，請於首月結束前將以下授權連結寄給客戶（首期即為第二個月）：\n${site}/api/pay/${orderId}2`
      : "";
  await notifyOwner(
    `[Avalo] 新訂單 ${orderId} — ${d.name}`,
    `一次性：NT$${oneTimeTotal}（未稅）\nEmail：${d.email}\n電話：${d.phone}${careNote}`
  );

  // 結帳只導向一次性付款；維護授權連結另行寄送（見上方店主通知）
  const firstMtn = oneTimeTotal > 0 ? `${orderId}1` : `${orderId}2`;
  return NextResponse.json({ orderId, payUrl: `/api/pay/${firstMtn}` });
}
