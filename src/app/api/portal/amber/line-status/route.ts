import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import { setLineStatus } from "@/lib/daigou-data";
import { isLineStatus } from "@/app/sites/amber/_data/settle";

// 單一品項的狀態。
//
// 這是 Amber 需求第 14 項的落地：「一張訂單裡 5 樣商品其中 1 樣缺貨，
// 希望只取消那 1 樣，不要整張訂單取消」。
//
// 採購清單負責批次決定，這一支負責個案微調——老客人優先、
// 或她答應過誰，那種人情判斷只有她知道。
//
// ⚠ 只改 status 與 gotQty，**絕不動金額**。unitPrice / qty / amount 是
// 下單當下的快照；缺貨要扣多少由 settleTotals 推導。

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const lineId = String(form.get("lineId") ?? "").trim();
  const status = String(form.get("status") ?? "");
  const settlementId = String(form.get("settlementId") ?? "").trim();
  if (!lineId || !isLineStatus(status)) return new NextResponse("Bad Request", { status: 400 });

  const gotRaw = String(form.get("gotQty") ?? "").trim();
  const gotQty = gotRaw ? Number(gotRaw.replace(/[^\d]/g, "")) : null;

  const ok = await setLineStatus(
    tenant.slug,
    lineId,
    status,
    Number.isFinite(gotQty as number) ? (gotQty as number) : null,
    String(form.get("note") ?? "").trim() || null,
  );
  if (!ok) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.redirect(
    absoluteUrl(
      req,
      settlementId
        ? `/portal/amber/settlements/${encodeURIComponent(settlementId)}`
        : "/portal/amber/settlements",
    ),
    303,
  );
}
