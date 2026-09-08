import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import {
  getBatch,
  purchaseLinesForBatch,
  listSettlements,
} from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import {
  purchaseList,
  type PurchaseSourceLine,
} from "@/app/sites/amber/_data/purchase-list";
import {
  settleLine,
  settleTotals,
  LINE_STATUS_ZH,
  SETTLEMENT_STATUS_ZH,
  type LineItemStatus,
  type SettlementStatus,
} from "@/app/sites/amber/_data/settle";
import { SHIP_KIND_ZH, cvsBrandName } from "@/app/sites/amber/_data/site";

// 採購清單／出貨清單／對帳表的 CSV。
//
// 她可能想印出來、貼給韓國的代買夥伴，或丟給會計。

export const dynamic = "force-dynamic";

/**
 * CSV 儲存格跳脫。以 = + - @ 開頭的儲存格會被 Excel 當公式執行
 * （可以拿來竊資料或執行指令），所以前面補一個單引號。
 * 沿用 src/app/api/portal/export/route.ts 的做法。
 */
const cell = (v: unknown): string => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const csv = (rows: unknown[][]): string => rows.map((r) => r.map(cell).join(",")).join("\r\n");

function download(body: string, filename: string) {
  return new NextResponse(
    // BOM：沒有它 Excel 會用系統編碼開啟，中文全變亂碼
    "﻿" + body,
    {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}

export async function GET(req: NextRequest) {
  // GET 不改狀態，所以不需要 sameOrigin；但一樣要有 session
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const kind = req.nextUrl.searchParams.get("kind") ?? "purchase";
  const batchId = req.nextUrl.searchParams.get("batchId") ?? "";
  const batch = await getBatch(tenant.slug, batchId);
  if (!batch) return new NextResponse("Not Found", { status: 404 });

  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "purchase") {
    const rows = await purchaseLinesForBatch(tenant.slug, batch.id);
    const source: PurchaseSourceLine[] = rows.map((l) => ({
      lineId: l.id,
      orderId: l.orderId,
      orderedAt: l.order.createdAt,
      orderStatus: l.order.status,
      memberName: l.order.member.name ?? "",
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
    return download(
      csv([
        ["商品", "規格", "需要", "已買到", "缺"],
        ...groups.map((g) => [
          g.name,
          g.optionLabel ?? "",
          g.needQty,
          g.gotQty,
          Math.max(0, g.needQty - g.gotQty),
        ]),
      ]),
      `${tenant.slug}-purchase-${stamp}.csv`,
    );
  }

  const settlements = await listSettlements(tenant.slug, { batchId: batch.id, take: 500 });

  if (kind === "packing") {
    const out: unknown[][] = [["客人", "手機", "商品", "規格", "數量", "取貨方式", "收件人", "收件電話"]];
    for (const s of settlements) {
      const ship = s.orders.at(-1);
      const where =
        ship?.shipKind === "cvs"
          ? `${SHIP_KIND_ZH.cvs}｜${cvsBrandName(ship.shipCvsBrand)} ${ship.shipCvsStoreName ?? ""} ${ship.shipCvsStoreId ?? ""}`
          : `${SHIP_KIND_ZH.home}｜${ship?.shipAddress ?? ""}`;
      for (const l of s.orders.flatMap((o) => o.lines)) {
        const st = settleLine({ ...l, status: l.status as LineItemStatus });
        // 缺貨與取消的不進出貨清單——列了只會讓她多裝一件回來退
        if (st.effectiveQty <= 0) continue;
        out.push([
          s.member.name ?? "",
          s.member.phoneDigits ?? "",
          l.name,
          l.optionLabel ?? "",
          st.effectiveQty,
          where,
          ship?.shipRecipient ?? "",
          ship?.shipPhone ?? "",
        ]);
      }
    }
    return download(csv(out), `${tenant.slug}-packing-${stamp}.csv`);
  }

  // kind === "settlements"：對帳表
  const out: unknown[][] = [
    ["結單編號", "客人", "手機", "狀態", "訂單數", "商品金額", "缺貨扣除", "調整", "運費", "折抵", "應收", "已收", "差額", "匯款末五碼", "貨態編號", "預計到貨"],
  ];
  for (const s of settlements) {
    const lines = s.orders.flatMap((o) => o.lines);
    const t = settleTotals({
      lines: lines.map((l) => ({
        unitPrice: l.unitPrice,
        qty: l.qty,
        amount: l.amount,
        gotQty: l.gotQty,
        status: l.status as LineItemStatus,
      })),
      shippingFee: s.shippingFee,
      adjustAmount: s.adjustAmount,
      creditApplied: s.creditApplied,
      paidAmount: s.paidAmount,
    });
    out.push([
      s.id,
      s.member.name ?? "",
      s.member.phoneDigits ?? "",
      SETTLEMENT_STATUS_ZH[s.status as SettlementStatus] ?? s.status,
      s.orders.length,
      t.grossAmount,
      t.deductAmount,
      t.adjustAmount,
      t.shippingFee,
      t.creditApplied,
      t.payableAmount,
      t.paidAmount,
      t.balance,
      s.remitLast5 ?? "",
      s.shipNo ?? "",
      s.etaAt ? formatTaipei(s.etaAt, { withTime: false }) : "",
    ]);
  }
  // 缺貨明細另附一段，她對客人交代時常用
  out.push([]);
  out.push(["以下為缺貨／取消明細"]);
  out.push(["客人", "商品", "規格", "訂購", "實際", "狀態"]);
  for (const s of settlements) {
    for (const l of s.orders.flatMap((o) => o.lines)) {
      const st = settleLine({ ...l, status: l.status as LineItemStatus });
      if (st.effectiveQty >= l.qty) continue;
      out.push([
        s.member.name ?? "",
        l.name,
        l.optionLabel ?? "",
        l.qty,
        st.effectiveQty,
        LINE_STATUS_ZH[l.status as LineItemStatus] ?? l.status,
      ]);
    }
  }
  return download(csv(out), `${tenant.slug}-settlements-${stamp}.csv`);
}
