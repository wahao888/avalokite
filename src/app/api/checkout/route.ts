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
    await prisma.subscription.create({
      data: {
        orderId: order.id,
        merchantTradeNo: mtn,
        sku: monthlySkus.join("+"),
        monthlyAmount: withTax(monthlyTotal),
      },
    });
  }

  await notifyOwner(
    `[Avalo] 新訂單 ${orderId} — ${d.name}`,
    `一次性：NT$${oneTimeTotal}（未稅）\n月費：NT$${monthlyTotal}/月（未稅）\nEmail：${d.email}\n電話：${d.phone}`
  );

  const firstMtn = oneTimeTotal > 0 ? `${orderId}1` : `${orderId}2`;
  return NextResponse.json({ orderId, payUrl: `/api/pay/${firstMtn}` });
}
