import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import { purchaseLinesForBatch, applyAllocations } from "@/lib/daigou-data";
import { purchaseList, type PurchaseSourceLine } from "@/app/sites/amber/_data/purchase-list";
import { allocate } from "@/app/sites/amber/_data/allocate";
import type { LineItemStatus } from "@/app/sites/amber/_data/settle";

// 採購清單的「套用」。
//
// 客戶端只送「這一項我實際買到幾件」——**分配給誰**由伺服器用純函式決定
// （_data/allocate.ts，先到先給、決定性、可解釋）。
// 讓客戶端送分配結果會多一條可以竄改的路徑，也會讓「為什麼是我缺貨」
// 這個問題變得答不出來。
//
// 一次交易寫完全部，不是二十次點擊。

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const batchId = String(form.get("batchId") ?? "").trim();
  if (!batchId) return new NextResponse("Bad Request", { status: 400 });

  const rows = await purchaseLinesForBatch(tenant.slug, batchId);
  const source: PurchaseSourceLine[] = rows.map((l) => ({
    lineId: l.id,
    orderId: l.orderId,
    orderedAt: l.order.createdAt,
    orderStatus: l.order.status,
    memberName: l.order.member.name ?? "（未填）",
    productId: l.productId,
    optionId: l.optionId,
    name: l.name,
    optionLabel: l.optionLabel,
    imageKey: l.imageKey,
    qty: l.qty,
    gotQty: l.gotQty,
    status: l.status as LineItemStatus,
  }));

  const groups = purchaseList(source);
  const allocations: { lineId: string; gotQty: number; status: string }[] = [];

  for (const g of groups) {
    const raw = form.get(`got:${g.key}`);
    // 這一項她沒填就跳過——不要把「沒動到」解讀成「買到 0 件」。
    if (raw === null) continue;
    const got = Number(String(raw).replace(/[^\d]/g, ""));
    if (!Number.isFinite(got)) continue;

    allocations.push(...allocate(g.candidates, got));
  }

  if (allocations.length > 0) {
    await applyAllocations(tenant.slug, allocations);
  }

  return NextResponse.redirect(
    absoluteUrl(req, `/portal/amber/batches/${encodeURIComponent(batchId)}/purchase?done=1`),
    303,
  );
}
