import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { normalizeOrderId } from "@/lib/shop-order-id";
import { getTenant } from "@/lib/tenants";
import { PAYMENT_LABEL, type PaymentKey } from "@/app/sites/rekat/_data/shop";

// 訂單查詢。需要「訂單編號 + 下單電話」兩者相符才回資料——
// 編號本身有 4 碼亂數尾巴，但光靠它不夠：包裹上印著編號，看得到包裹的人不該
// 因此看得到訂購人的姓名與地址。所以第二個因子是電話。
//
// 回傳刻意不含完整地址與 email，只回「這張單現在到哪了」需要的欄位。
const TENANT = getTenant("rekat")!;

const schema = z.object({
  id: z.string().trim().min(4).max(40),
  phone: z.string().trim().min(6).max(30),
});

// 這支等於是猜編號＋猜電話的入口，限制比下單本身更嚴
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const STATUS_ZH: Record<string, string> = {
  pending: "待確認",
  confirmed: "已確認・備貨中",
  shipped: "已出貨",
  done: "已完成",
  cancelled: "已取消",
};

/** 只留數字比對：客人可能打 0935156000、0935-156000 或 +886935156000 */
const digits = (s: string) => s.replace(/\D/g, "");

export async function POST(req: NextRequest) {
  if (rateLimited(`lookup:${TENANT.slug}:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const id = normalizeOrderId(parsed.data.id);
  const order = await prisma.shopOrder.findFirst({ where: { id, tenantId: TENANT.slug } });

  // 找不到與電話不符回同一個訊息：否則這支 API 會變成「這個編號存在嗎」的探測器
  const inPhone = digits(parsed.data.phone);
  if (!order || !inPhone || digits(order.phone) !== inPhone) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let items: unknown = [];
  try {
    items = JSON.parse(order.items);
  } catch {
    items = [];
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      status: order.status,
      statusZh: STATUS_ZH[order.status] ?? order.status,
      payment: order.payment,
      paymentZh: PAYMENT_LABEL[order.payment as PaymentKey] ?? order.payment,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      items,
      remitLast5: order.remitLast5,
      remitAt: order.remitAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    },
  });
}
