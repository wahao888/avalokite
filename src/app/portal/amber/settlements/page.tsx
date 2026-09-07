import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { listBatches, listSettlements } from "@/lib/daigou-data";
import { tenantOrigin } from "@/lib/tenants";
import { twd } from "@/app/sites/amber/_data/cart";
import {
  settleTotals,
  SETTLEMENT_STATUS_ZH,
  type LineItemStatus,
  type SettlementStatus,
} from "@/app/sites/amber/_data/settle";
import { settlementRequestText } from "@/app/sites/amber/_data/notify-text";
import { BANK, LINEPAY } from "@/app/sites/amber/_data/site";
import { CopyButton } from "../../_components/CopyButton";
import LoginForm from "../../LoginForm";

export const dynamic = "force-dynamic";

// 結單列表。
//
// 這一頁的重點是**每一列右邊那顆「複製通知」**：她點一下、切到 LINE、
// 貼上、下一位。20 個客人約兩分鐘。
// 做成只有群組版的總表等於沒做——請款金額是逐客人不同的。

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; status?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const batches = await listBatches(tenant.slug);
  const batchId = sp.batch || batches[0]?.id;
  if (!batchId) {
    return (
      <main className="p-wrap">
        <h1 className="p-title">結單</h1>
        <p className="p-empty">還沒有任何連線。</p>
      </main>
    );
  }

  const rows = await listSettlements(tenant.slug, {
    batchId,
    status: sp.status,
    take: 200,
  });
  const batch = batches.find((b) => b.id === batchId);
  const origin = tenantOrigin(tenant);

  const totalPayable = rows.reduce((s, r) => s + r.payableAmount, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
  const unpaid = rows.filter((r) => r.status === "awaiting" && r.paidAmount < r.payableAmount);

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">結單</h1>
          <p className="p-sub">
            {batch?.title}・一位客人一張，同檔期的多筆訂單都併在裡面，運費只收一次。
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber">
            連線管理
          </a>
          <a
            className="p-btn p-btn-ghost"
            href={`/api/portal/amber/export?kind=settlements&batchId=${encodeURIComponent(batchId)}`}
          >
            下載 CSV
          </a>
        </div>
      </div>

      <div className="p-filters">
        {batches.map((b) => (
          <a
            key={b.id}
            href={`/portal/amber/settlements?batch=${encodeURIComponent(b.id)}`}
            className={b.id === batchId ? "on" : ""}
          >
            {b.title}
          </a>
        ))}
      </div>

      <div className="p-stats">
        <div className="p-stat">
          結單<b>{rows.length}</b>
        </div>
        <div className="p-stat">
          應收<b>{twd(totalPayable)}</b>
        </div>
        <div className="p-stat">
          已收<b>{twd(totalPaid)}</b>
        </div>
        <div className="p-stat">
          未付<b>{unpaid.length}</b>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-empty">這一檔還沒有訂單。</p>
      ) : (
        rows.map((r) => {
          const lines = r.orders.flatMap((o) => o.lines);
          const totals = settleTotals({
            lines: lines.map((l) => ({
              unitPrice: l.unitPrice,
              qty: l.qty,
              amount: l.amount,
              gotQty: l.gotQty,
              status: l.status as LineItemStatus,
            })),
            shippingFee: r.shippingFee,
            adjustAmount: r.adjustAmount,
            creditApplied: r.creditApplied,
            paidAmount: r.paidAmount,
          });

          // 請款文字。金額直接吃 settleTotals 的結果——兩邊各算一次，
          // 某天只改了其中一邊，客人收到的數字就會跟畫面不同。
          const text = settlementRequestText({
            memberName: r.member.name ?? "您好",
            batchTitle: batch?.title ?? "",
            totals,
            items: lines.map((l) => ({
              name: l.name,
              optionLabel: l.optionLabel,
              qty: l.qty,
              effectiveQty: l.gotQty ?? (l.status === "oos" || l.status === "cancelled" || l.status === "refunded" ? 0 : l.qty),
              status: l.status,
            })),
            url: `${origin}/s/${r.lookupToken}`,
            bank: BANK,
            linepay: LINEPAY,
            etaAt: r.etaAt,
          });

          return (
            <div key={r.id} className="p-dg-settle">
              <div className="p-dg-settle__head">
                <div>
                  <a href={`/portal/amber/settlements/${encodeURIComponent(r.id)}`}>
                    <strong>{r.member.name ?? "（未填姓名）"}</strong>
                  </a>
                  <div className="p-dg-hint">
                    {r.member.phoneDigits}
                    {r.member.lineId ? `・LINE ${r.member.lineId}` : ""}
                    ・{r.orders.length} 筆訂單
                  </div>
                </div>
                <div className="p-dg-settle__amt">
                  <b>{twd(totals.payableAmount)}</b>
                  <div className="p-dg-hint">
                    {SETTLEMENT_STATUS_ZH[r.status as SettlementStatus] ?? r.status}
                    {totals.paidAmount > 0 ? `・已收 ${twd(totals.paidAmount)}` : ""}
                    {r.remitLast5 ? `・回報 ${r.remitLast5}` : ""}
                  </div>
                </div>
                {/* ⭐ 逐客人一顆。做成群組總表她就得自己一個一個打。 */}
                <CopyButton text={text} label="複製請款通知" />
              </div>
            </div>
          );
        })
      )}
    </main>
  );
}
