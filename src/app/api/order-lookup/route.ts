import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderId: z.string().trim().regex(/^[A-Z0-9]{6,20}$/i),
  email: z.string().trim().email().max(200),
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
  const { orderId, email } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId.toUpperCase() },
    include: { payments: true, subscriptions: true },
  });
  // Email 必須相符，避免列舉他人訂單
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    items: JSON.parse(order.items),
    oneTimeTotal: order.oneTimeTotal,
    monthlyTotal: order.monthlyTotal,
    payments: order.payments.map((p) => ({
      kind: p.kind,
      amount: p.amount,
      status: p.status,
      paidAt: p.paidAt,
      merchantTradeNo: p.merchantTradeNo,
    })),
    subscriptions: order.subscriptions.map((s) => ({
      sku: s.sku,
      monthlyAmount: s.monthlyAmount,
      status: s.status,
      totalSuccessTimes: s.totalSuccessTimes,
      lastChargeAt: s.lastChargeAt,
    })),
  });
}
