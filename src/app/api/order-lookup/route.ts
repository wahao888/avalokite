import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// 查詢需同時提供訂單編號與相符的 Email，但沒有限流的話仍可暴力猜測訂單編號
// （AVL + 秒級時間戳 + 24 bit 隨機）。10 次/10 分鐘足夠真實查詢者使用。
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const schema = z.object({
  orderId: z.string().trim().regex(/^[A-Z0-9]{6,20}$/i),
  email: z.string().trim().email().max(200),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`order-lookup:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
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
      // 管理訂閱頁的憑證。查詢已驗證過訂單編號＋Email，交出這組編號是安全的
      merchantTradeNo: s.merchantTradeNo,
    })),
  });
}
