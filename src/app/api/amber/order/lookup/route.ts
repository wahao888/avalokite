import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenant } from "@/lib/tenants";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { orderCodeInput, shortOrderCode } from "@/lib/shop-order-id";
import { lookupForCustomer } from "@/lib/daigou-data";
import { normalizePhone } from "@/app/sites/amber/_data/member";
import {
  settlementTotalsFor,
  settlementShipKind,
  LINE_STATUS_ZH,
  type LineItemStatus,
} from "@/app/sites/amber/_data/settle";

// 查訂單 / 查結單。
//
// 雙因子：手機 + 編號。編號可以是完整的（AM260907-P3SA），也可以只打**後 4 碼**——
// 前面那段日期是給店家對帳用的，客人不需要，而且在手機上打 13 個字很累。
//
// 安全性沒有因此變差：日期本來就高度可猜（就是最近幾天），真正的亂度一直都在
// 那 4 碼；而且比對只在「這支手機對應的那位會員自己的單」裡進行。
//
// ⚠ 查無此編號與電話不符**回同一個 404**——否則這支 API 就變成一台編號探測器。

export const dynamic = "force-dynamic";

const TENANT = getTenant("amber")!;
const RATE = { windowMs: 10 * 60_000, max: 10 };

const Schema = z.object({
  id: z.string().trim().min(3).max(40),
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

  const code = orderCodeInput(parsed.data.id);
  if (!code) return NextResponse.json({ error: "not found" }, { status: 404 });

  const hit = await lookupForCustomer(TENANT.slug, phoneDigits, code);
  if (!hit) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (hit.kind === "settlement") {
    const s = hit.settlement;
    const lines = s.orders.flatMap((o) => o.lines);
    const totals = settlementTotalsFor({
      ...s,
      shipKind: settlementShipKind(s.orders),
      lines: lines.map((l) => ({
        unitPrice: l.unitPrice,
        qty: l.qty,
        amount: l.amount,
        gotQty: l.gotQty,
        status: l.status as LineItemStatus,
      })),
    });
    return NextResponse.json({
      ok: true,
      kind: "settlement",
      // 給連結而不是把整份明細塞進這個回應——/s/<token> 那一頁本來就要做這件事
      url: `/s/${s.lookupToken}`,
      id: s.id,
      code: shortOrderCode(s.id),
      status: s.status,
      payable: totals.payableAmount,
    });
  }

  const order = hit.order;
  return NextResponse.json({
    ok: true,
    kind: "order",
    id: order.id,
    code: shortOrderCode(order.id),
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
