import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBatch, listSettlements } from "@/lib/daigou-data";
import { twd } from "@/app/sites/amber/_data/cart";
import {
  settleLine,
  settleTotals,
  SETTLEMENT_STATUS_ZH,
  type LineItemStatus,
  type SettlementStatus,
} from "@/app/sites/amber/_data/settle";
import { SHIP_KIND_ZH, cvsBrandName } from "@/app/sites/amber/_data/site";
import LoginForm from "../../../../LoginForm";

export const dynamic = "force-dynamic";

// 出貨清單。採購清單的另一面：那一頁是「總共要買什麼」，
// 這一頁是「一個客人一包」——她照著這個裝箱貼單。
//
// 缺貨與取消的品項不列出來，列了只會讓她多裝一件回來退。

export default async function PackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const batch = await getBatch(tenant.slug, id);
  if (!batch) notFound();

  const rows = await listSettlements(tenant.slug, { batchId: batch.id, take: 300 });

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">出貨清單</h1>
          <p className="p-sub">{batch.title}・一個客人一包，只列實際買到的品項。</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href={`/portal/amber/batches/${encodeURIComponent(batch.id)}`}>
            回檔期
          </a>
          <a
            className="p-btn p-btn-ghost"
            href={`/api/portal/amber/export?kind=packing&batchId=${encodeURIComponent(batch.id)}`}
          >
            下載 CSV
          </a>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-empty">這一檔還沒有結單。</p>
      ) : (
        rows.map((r) => {
          const lines = r.orders.flatMap((o) => o.lines);
          const packed = lines
            .map((l) => ({ l, st: settleLine({ ...l, status: l.status as LineItemStatus }) }))
            .filter(({ st }) => st.effectiveQty > 0);

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

          const ship = r.orders.at(-1);

          return (
            <div key={r.id} className="p-dg-settle" style={{ pageBreakInside: "avoid" }}>
              <div className="p-dg-settle__head">
                <div>
                  <a href={`/portal/amber/settlements/${encodeURIComponent(r.id)}`}>
                    <strong>{r.member.name ?? "（未填姓名）"}</strong>
                  </a>
                  <div className="p-dg-hint">
                    {r.id}・{SETTLEMENT_STATUS_ZH[r.status as SettlementStatus] ?? r.status}
                    {totals.balance > 0 ? `・未收 ${twd(totals.balance)}` : "・已收齊"}
                  </div>
                </div>
                <div className="p-dg-settle__amt">
                  <b>{packed.reduce((n, { st }) => n + st.effectiveQty, 0)} 件</b>
                  <div className="p-dg-hint">{twd(totals.payableAmount)}</div>
                </div>
              </div>

              {packed.length === 0 ? (
                <p className="p-dg-hint">這位客人這一檔全部缺貨，不用出貨。</p>
              ) : (
                <ul style={{ margin: "0.5rem 0 0", paddingInlineStart: "1.2rem" }}>
                  {packed.map(({ l, st }) => (
                    <li key={l.id} style={{ fontSize: "0.9rem" }}>
                      {l.name}
                      {l.optionLabel ? `（${l.optionLabel}）` : ""} ×{st.effectiveQty}
                    </li>
                  ))}
                </ul>
              )}

              {ship && (
                <p className="p-dg-hint" style={{ marginTop: "0.5rem" }}>
                  {ship.shipRecipient}　{ship.shipPhone}
                  <br />
                  {ship.shipKind === "cvs"
                    ? `${SHIP_KIND_ZH.cvs}｜${cvsBrandName(ship.shipCvsBrand)} ${ship.shipCvsStoreName ?? ""} ${ship.shipCvsStoreId ?? ""}`
                    : `${SHIP_KIND_ZH.home}｜${ship.shipAddress ?? ""}`}
                </p>
              )}
            </div>
          );
        })
      )}
    </main>
  );
}
