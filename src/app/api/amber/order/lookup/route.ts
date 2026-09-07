import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenant } from "@/lib/tenants";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { normalizeOrderId } from "@/lib/shop-order-id";
import { getOrderForLookup, getSettlementForLookup } from "@/lib/daigou-data";
import { normalizePhone } from "@/app/sites/amber/_data/member";
import { settleTotals, LINE_STATUS_ZH, type LineItemStatus } from "@/app/sites/amber/_data/settle";

// 查訂單 / 查結單。
//
// 雙因子：編號 + 下單手機，兩者相符才給資料。
// ⚠ 查無此編號與電話不符**回同一個 404**——否則這支 API 就變成一台
// 編號探測器（試出哪些編號存在，再去猜電話）。同 REKAT 的做法。
//
// 回應刻意不含完整地址與 email：這一頁憑「編號＋手機」就看得到，
// 而編號會出現在包裹上。

export const dynamic = "force-dynamic";

const TENANT = getTenant("amber")!;
const RATE = { windowMs: 10 * 60_000, max: 10 };

const Schema = z.object({
  id: z.string().trim().min(4).max(40),
  phone: z.string().trim().min(6).max(30),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`lookup:${TENANT.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const phoneDigits = normalizePhone(parsed.data.phone);
  if (!phoneDigits) return NextResponse.json({ error: "not found" }, { status: 404 });

  const id = normalizeOrderId(parsed.data.id);

  // 編號可能是訂單（AM…）也可能是結單（AS…）——客人手上有哪一個都能查。
  const settlement = await getSettlementForLookup(TENANT.slug, id, phoneDigits);
  if (settlement) {
    const lines = settlement.orders.flatMap((o) => o.lines);
    const totals = settleTotals({
      lines: lines.map((l) => ({
        unitPrice: l.unitPrice,
        qty: l.qty,
        amount: l.amount,
        gotQty: l.gotQty,
        status: l.status as LineItemStatus,
      })),
      shippingFee: settlement.shippingFee,
      adjustAmount: settlement.adjustAmount,
      creditApplied: settlement.creditApplied,
      paidAmount: settlement.paidAmount,
    });
    return NextResponse.json({
      ok: true,
      kind: "settlement",
      // 給連結而不是把整份明細塞進這個回應——/s/<token> 那一頁本來就要做這件事
      url: `/s/${settlement.lookupToken}`,
      id: settlement.id,
      status: settlement.status,
      payable: totals.payableAmount,
    });
  }

  const order = await getOrderForLookup(TENANT.slug, id, phoneDigits);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    kind: "order",
    id: order.id,
    createdAt: order.createdAt,
    itemsTotal: order.itemsTotal,
    status: order.status,
    items: order.lines.map((l) => ({
      name: l.name,
      optionLabel: l.optionLabel,
      qty: l.qty,
      amount: l.amount,
      status: l.status,
      statusZh: LINE_STATUS_ZH[l.status as LineItemStatus] ?? l.status,
      gotQty: l.gotQty,
    })),
    // 已經歸到結單的話就把連結給她——那裡才有應付金額與匯款資訊
    settlementUrl: order.settlement ? `/s/${order.settlement.lookupToken}` : null,
  });
}
