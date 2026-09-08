import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBatch, purchaseLinesForBatch } from "@/lib/daigou-data";
import { thumbUrl } from "@/lib/media-url";
import {
  purchaseList,
  purchaseSummary,
  type PurchaseSourceLine,
} from "@/app/sites/amber/_data/purchase-list";
import { allocate, explainAllocation } from "@/app/sites/amber/_data/allocate";
import { LINE_STATUS_ZH, type LineItemStatus } from "@/app/sites/amber/_data/settle";
import LoginForm from "../../../../LoginForm";

export const dynamic = "force-dynamic";

// 採購清單。她收單之後最重要的畫面。
//
// 手上有二十件商品散落在十幾張訂單裡，而她要走進店裡買東西——
// 她需要的不是訂單列表，是「總共該買什麼」：依 商品 × 規格 彙總的一張清單，
// 一根拇指由上往下掃過去。沒有這一頁，她就得自己把十幾張訂單加總一次，
// 那正是這個系統該替她做的事。
//
// 分配（需要 7 只買到 5，是誰缺貨）由伺服器的純函式決定，先到先給。
// 個別微調在結單詳情頁做——這一頁負責「批次決定」，那一頁負責「個案處理」。

export default async function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
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

  const rows = await purchaseLinesForBatch(tenant.slug, batch.id);
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
  const sum = purchaseSummary(groups);

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">採購清單</h1>
          <p className="p-sub">
            {batch.title}・跨所有訂單彙總。買回來後在這裡填「實際買到幾件」。
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href={`/portal/amber/batches/${encodeURIComponent(batch.id)}`}>
            回檔期
          </a>
          <a
            className="p-btn p-btn-ghost"
            href={`/api/portal/amber/export?kind=purchase&batchId=${encodeURIComponent(batch.id)}`}
          >
            下載 CSV
          </a>
        </div>
      </div>

      {sp.done && <div className="p-note">已套用。缺貨的品項已經標好，可以去結單了。</div>}

      <div className="p-stats">
        <div className="p-stat">
          要買<b>{sum.totalNeed}</b>
        </div>
        <div className="p-stat">
          已標記<b>{sum.totalGot}</b>
        </div>
        <div className="p-stat">
          缺<b>{sum.shortage}</b>
        </div>
        <div className="p-stat">
          未處理<b>{sum.pendingGroups}</b>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="p-empty">這一檔還沒有任何訂單。</p>
      ) : (
        <form method="post" action="/api/portal/amber/allocate">
          <input type="hidden" name="batchId" value={batch.id} />

          {groups.map((g) => {
            // 先預覽一次「照目前的數字會怎麼分」，讓她按之前就看得到結果。
            // 用的是套用時同一支純函式，所以預覽跟實際結果一定一致。
            const preview = allocate(g.candidates, g.gotQty);
            const who = explainAllocation(
              g.candidates,
              preview,
              (orderId) => g.lines.find((l) => l.orderId === orderId)?.memberName ?? "",
            );
            const short = g.needQty - g.gotQty;

            return (
              <div key={g.key} className="p-dg-purchase">
                <div className="p-dg-purchase__head">
                  {g.imageKey ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(g.imageKey)} alt="" width={44} height={44} loading="lazy" />
                  ) : null}
                  <div className="p-dg-purchase__name">
                    <strong>{g.name}</strong>
                    <div>{g.optionLabel ?? "（無規格）"}</div>
                  </div>
                  <div className="p-dg-purchase__need">
                    需要
                    <b>{g.needQty}</b>
                  </div>
                  <label className="p-dg-purchase__got">
                    <span>買到</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name={`got:${g.key}`}
                      defaultValue={g.gotQty}
                      aria-label={`${g.name} ${g.optionLabel ?? ""} 實際買到幾件`}
                    />
                  </label>
                </div>

                {short > 0 && (
                  <p className="p-dg-hint" style={{ color: "var(--p-warn)" }}>
                    缺 {short} 件——依下單時間先到先給：{who.join("／")}
                  </p>
                )}

                {/* 已經標記過的行，把結果攤開讓她核對 */}
                {g.settled && (
                  <details className="p-dg-more">
                    <summary>看分配明細（{g.lines.length} 筆）</summary>
                    {g.lines.map((l) => (
                      <div key={l.lineId} className="p-dg-hint">
                        {l.memberName} ×{l.qty}
                        {l.gotQty !== null && l.gotQty < l.qty ? ` → 只給 ${l.gotQty}` : ""}
                        {l.status !== "ordered" ? `　${LINE_STATUS_ZH[l.status]}` : ""}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            );
          })}

          <div className="p-dg-sticky">
            <button type="submit" className="p-btn">
              套用（一次寫入全部）
            </button>
          </div>
          <p className="p-dg-hint">
            套用會依「下單時間先到先給」分配缺貨。要個別調整某位客人，
            到<strong>結單</strong>頁面改那一行就好。
          </p>
        </form>
      )}
    </main>
  );
}
