import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTenant } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { normalizeOrderId } from "@/lib/shop-order-id";
import { getTenant } from "@/lib/tenants";
import { isSuspended } from "@/lib/suspension";
import { isPayment, needsPaymentReport } from "@/app/sites/rekat/_data/shop";

// 付款回報。客人轉完帳自己填帳號末五碼，老闆才對得起帳。
// 貨到付款不適用——錢是當面給宅配的，沒有東西要回報。
// 與查詢同樣需要「編號 + 電話」相符，避免有人替別人的訂單亂填。
const TENANT = getTenant("rekat")!;

const schema = z.object({
  id: z.string().trim().min(4).max(40),
  phone: z.string().trim().min(6).max(30),
  last5: z.string().trim().regex(/^\d{5}$/, "末五碼必須是 5 位數字"),
  remitName: z.string().trim().max(60).optional().or(z.literal("")),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const digits = (s: string) => s.replace(/\D/g, "");

export async function POST(req: NextRequest) {
  // 站台因欠費暫停時，表單／訂單 API 一起停：只關公開頁面而留著 API，
  // 等於客人看不到店卻還能下單，訂單會落進一個沒人在服務的信箱。
  if (isSuspended(TENANT.slug)) {
    return NextResponse.json({ error: "service suspended" }, { status: 503 });
  }

  if (rateLimited(`remit:${TENANT.slug}:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
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
  const inPhone = digits(parsed.data.phone);
  if (!order || !inPhone || digits(order.phone) !== inPhone) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!isPayment(order.payment) || !needsPaymentReport(order.payment)) {
    return NextResponse.json({ error: "payment does not need reporting" }, { status: 400 });
  }

  // updateMany 而非 update：where 帶得進 tenantId，漏掉租戶範圍在型別層就寫不出來
  await prisma.shopOrder.updateMany({
    where: { id: order.id, tenantId: TENANT.slug },
    data: {
      remitLast5: parsed.data.last5,
      remitName: parsed.data.remitName || null,
      remitAt: new Date(),
    },
  });

  await notifyTenant(TENANT, {
    subject: `[REKAT] 付款回報 ${order.id} — 末五碼 ${parsed.data.last5}`,
    text: [
      `訂單編號：${order.id}`,
      `訂購人：${order.name}（${order.phone}）`,
      `應付金額：NT$${order.total.toLocaleString("en-US")}`,
      "",
      `末五碼：${parsed.data.last5}`,
      parsed.data.remitName ? `付款人：${parsed.data.remitName}` : null,
      "",
      "核帳後請到後台把這張單標為「已確認」。",
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  });

  return NextResponse.json({ ok: true });
}
