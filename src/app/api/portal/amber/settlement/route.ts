import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import {
  getSettlement,
  freezeSettlement,
  setSettlementStatus,
  setSettlementShipping,
  moveOrderToSettlement,
  addLedger,
  memberLedgerEntries,
} from "@/lib/daigou-data";
import { parseTaipeiLocalInput } from "@/lib/tw-time";
import {
  liveSettlement,
  memberCredit,
  creditToApply,
  isSettlementStatus,
  type LineItemStatus,
} from "@/app/sites/amber/_data/settle";

// 結單的所有動作。純 HTML 表單（無 JS）——這些是一天做幾次的操作，
// 不趕時間，而且瀏覽器自己會處理重送。

export const dynamic = "force-dynamic";

const num = (v: FormDataEntryValue | null): number => {
  const s = String(v ?? "").replace(/[^\d-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  const action = String(form.get("action") ?? "");
  if (!id) return new NextResponse("Bad Request", { status: 400 });

  const target = `/portal/amber/settlements/${encodeURIComponent(id)}`;
  const back = (error?: string) =>
    NextResponse.redirect(absoluteUrl(req, error ? `${target}?error=${error}` : target), 303);

  const s = await getSettlement(tenant.slug, id);
  if (!s) return new NextResponse("Not Found", { status: 404 });

  if (action === "freeze") {
    // 結單：把即時計算的金額凍結進資料庫。
    // 凍結之後行狀態再變動一律走 adjustAmount，不回頭改 grossAmount——
    // 金額已經通知出去了，改了就不可稽核。
    const lines = s.orders.flatMap((o) => o.lines);

    // 折抵：這位客人上一檔缺貨留下的餘額，先算出可用多少
    const ledger = await memberLedgerEntries(tenant.slug, s.memberId);
    const available = memberCredit(ledger.map((e) => ({ kind: e.kind as never, amount: e.amount })));

    const asLines = lines.map((l) => ({
      unitPrice: l.unitPrice,
      qty: l.qty,
      amount: l.amount,
      gotQty: l.gotQty,
      status: l.status as LineItemStatus,
    }));

    // 運費依 7-11 交貨便的申報價值級距自動算（依商品淨額，也就是真正裝箱的東西）。
    // 固定金額的檔期則沿用她填的數字。
    const before = liveSettlement({ lines: asLines, batch: s.batch });
    const applied = creditToApply(available, before.payableAmount);
    const totals = liveSettlement({ lines: asLines, batch: s.batch, creditApplied: applied });

    const ok = await freezeSettlement(tenant.slug, id, {
      grossAmount: totals.grossAmount,
      deductAmount: totals.deductAmount,
      adjustAmount: totals.adjustAmount,
      shippingFee: totals.shippingFee,
      creditApplied: applied,
      payableAmount: totals.payableAmount,
    });
    if (!ok) return back("frozen");

    // 用掉的折抵要記一筆，否則餘額永遠不會減少
    if (applied > 0) {
      await addLedger(tenant.slug, {
        memberId: s.memberId,
        settlementId: id,
        kind: "credit_use",
        amount: applied,
        method: "credit",
        note: `折抵於 ${id}`,
      });
    }
    return back();
  }

  if (action === "status") {
    const status = String(form.get("status") ?? "");
    if (!isSettlementStatus(status)) return back("bad");
    await setSettlementStatus(tenant.slug, id, status);
    return back();
  }

  if (action === "shipping") {
    const etaRaw = String(form.get("etaAt") ?? "").trim();
    const etaAt = etaRaw ? parseTaipeiLocalInput(`${etaRaw}T12:00`) : null;
    if (etaRaw && !etaAt) return back("eta");

    await setSettlementShipping(tenant.slug, id, {
      shippingFee: num(form.get("shippingFee")),
      shipNo: String(form.get("shipNo") ?? "").trim() || null,
      etaAt,
      adjustAmount: num(form.get("adjustAmount")),
      adjustNote: String(form.get("adjustNote") ?? "").trim() || null,
    });
    return back();
  }

  if (action === "ledger") {
    // 收款／退款／折抵。做成流水而不是布林值，因為部分收款是合法的
    // （客人分兩次匯），而且要答得出「這 200 元是哪一檔缺貨來的」。
    const kind = String(form.get("kind") ?? "");
    if (!["payment", "refund", "credit"].includes(kind)) return back("bad");
    const amount = Math.abs(num(form.get("amount")));
    if (amount <= 0) return back("bad");

    await addLedger(tenant.slug, {
      memberId: s.memberId,
      settlementId: id,
      kind,
      amount,
      method: String(form.get("method") ?? "transfer"),
      last5: String(form.get("last5") ?? "").trim() || null,
      note: String(form.get("note") ?? "").trim() || null,
    });
    return back();
  }

  if (action === "move-order") {
    // 手動把別檔期的訂單挪進這張結單（跨檔期併成一次出貨）
    const orderId = String(form.get("orderId") ?? "").trim();
    if (!orderId) return back("bad");
    const ok = await moveOrderToSettlement(tenant.slug, orderId, id);
    return ok ? back() : back("notfound");
  }

  return back("bad");
}
