import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTenant } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { makeOrderId } from "@/lib/shop-order-id";
import { getTenant } from "@/lib/tenants";
import { getBeanStock } from "@/lib/tenant-data";
import { getBean } from "@/app/sites/rekat/_data/beans";
import {
  isPayment,
  MAX_LINES,
  MAX_QTY_PER_LINE,
  PAYMENT_LABEL,
  priceCart,
  twd,
  type CartLine,
} from "@/app/sites/rekat/_data/shop";

// REKAT ROASTERY 線上訂單
//
// 租戶由「路徑常數」決定，不看 Host：API 不經過 proxy.ts 的 Host 改寫，
// 而 Host 是使用者可控的輸入，拿它決定資料要寫進誰的帳戶等於開後門。
const TENANT = getTenant("rekat")!;
const ID_PREFIX = "RK";

const schema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(80),
        qty: z.number().int().min(1).max(MAX_QTY_PER_LINE),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  payment: z.string().trim().max(20),
  name: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  address: z.string().trim().min(6).max(200),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
  // honeypot
  website: z.string().max(500).optional().or(z.literal("")),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;

export async function POST(req: NextRequest) {
  // key 帶 tenant：一家客戶被灌爆不影響其他客戶站
  if (rateLimited(`order:${TENANT.slug}:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
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

  // Honeypot：機器人填了隱藏欄位 → 給一個假的成功回應，不落庫不寄信
  if (d.website) {
    return NextResponse.json({ ok: true, id: makeOrderId(ID_PREFIX) });
  }

  if (!isPayment(d.payment)) {
    return NextResponse.json({ error: "invalid payment" }, { status: 400 });
  }

  // ── 金額一律由伺服器重算 ────────────────────────────────────
  // 前端送過來的只有 slug / 研磨度 / 數量，沒有任何金額欄位。
  // priceCart 是前後台共用的同一支純函式（見 _data/shop.ts），
  // 所以「客人改了 devtools 裡的價格」這件事在結構上不可能發生。
  // 店家標為售完／下架的豆子不能成立訂單。
  // 一定要在伺服器擋：客人的購物車可能是幾天前加的，那時還有貨。
  const stockRow = await getBeanStock(TENANT.slug);
  const unavailable = new Set([...stockRow.soldOut, ...stockRow.hidden]);
  const blocked = d.items.filter((i) => unavailable.has(i.slug));
  if (blocked.length > 0) {
    return NextResponse.json(
      {
        error: "unavailable",
        // 回品名而不是 slug：這串會直接顯示給客人看
        items: blocked.map((i) => getBean(i.slug)?.nameZh ?? i.slug),
      },
      { status: 409 },
    );
  }

  const lines: CartLine[] = d.items.map((i) => ({ slug: i.slug, qty: i.qty }));

  const totals = priceCart(lines, d.payment);
  if (totals.lines.length === 0) {
    // 全部品項都對不上豆單——多半是客人的購物車放了很久、豆單已經換過
    return NextResponse.json({ error: "empty cart" }, { status: 400 });
  }

  const id = makeOrderId(ID_PREFIX);

  // 下單當下的快照。豆單改價之後，這張單還要對得起帳，不能回頭讀 _data/beans.ts 重算。
  const itemsJson = JSON.stringify(
    totals.lines.map((l) => ({
      slug: l.slug,
      name: l.name,
      unitPrice: l.unitPrice,
      qty: l.qty,
      amount: l.amount,
    })),
  );
  const bundlesJson = JSON.stringify(totals.bundles);

  // 先落庫再寄信：SMTP 掛掉時客戶後台仍看得到訂單，不會漏單。
  const order = await prisma.shopOrder.create({
    data: {
      id,
      tenantId: TENANT.slug,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      address: d.address,
      note: d.note || null,
      items: itemsJson,
      bundles: bundlesJson,
      payment: d.payment,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.total,
    },
  });

  const lineText = totals.lines
    .map((l) => `・${l.name} × ${l.qty} 包　${twd(l.amount)}`)
    .join("\n");

  const bundleText = totals.bundles
    .map(
      (b) =>
        `・${b.name}　${b.label}${b.bundlePrice} × ${b.sets} 組　−${twd(b.saved)}`,
    )
    .join("\n");

  const notified = await notifyTenant(TENANT, {
    subject: `[REKAT] 新訂單 ${order.id} — ${d.name}　${twd(totals.total)}`,
    replyTo: d.email || undefined,
    text: [
      `訂單編號：${order.id}`,
      `付款方式：${PAYMENT_LABEL[d.payment]}`,
      "",
      "【品項】",
      lineText,
      "",
      totals.bundles.length > 0 ? "【三包優惠】" : null,
      totals.bundles.length > 0 ? bundleText : null,
      totals.bundles.length > 0 ? "" : null,
      `品項定價合計：${twd(totals.listTotal)}`,
      totals.discount > 0 ? `優惠折抵：−${twd(totals.discount)}` : null,
      `小計：${twd(totals.subtotal)}`,
      `運費：${totals.shippingFee === 0 ? "免運" : twd(totals.shippingFee)}`,
      `合計：${twd(totals.total)}`,
      "",
      "【收件】",
      `姓名：${d.name}`,
      `電話：${d.phone}`,
      `Email：${d.email || "-"}`,
      `地址：${d.address}`,
      d.note ? `備註：${d.note}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  });

  if (notified) {
    await prisma.shopOrder.updateMany({
      where: { id: order.id, tenantId: TENANT.slug },
      data: { notified: true },
    });
  }

  return NextResponse.json({
    ok: true,
    id: order.id,
    total: totals.total,
    payment: d.payment,
  });
}
