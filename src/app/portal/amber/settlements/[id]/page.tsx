import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getSettlement, memberLedgerEntries } from "@/lib/daigou-data";
import { tenantOrigin } from "@/lib/tenants";
import { formatTaipei, toTaipeiLocalInput } from "@/lib/tw-time";
import { twd } from "@/app/sites/amber/_data/cart";
import {
  settleTotals,
  settleLine,
  memberCredit,
  LINE_STATUSES,
  LINE_STATUS_ZH,
  SETTLEMENT_STATUS_ZH,
  isFrozen,
  type LineItemStatus,
  type SettlementStatus,
} from "@/app/sites/amber/_data/settle";
import { shortageNoticeText, shippedNoticeText } from "@/app/sites/amber/_data/notify-text";
import { SHIP_KIND_ZH, cvsBrandName } from "@/app/sites/amber/_data/site";
import { CopyBlock } from "../../../_components/CopyButton";
import LoginForm from "../../../LoginForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  bad: "資料不完整，請再試一次。",
  eta: "預計到貨日的格式不對。",
  frozen: "這張結單已經結過了，金額不會再自動重算。",
  notfound: "找不到那筆資料。",
};

export default async function SettlementDetail({
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

  const s = await getSettlement(tenant.slug, id);
  if (!s) notFound();

  const lines = s.orders.flatMap((o) => o.lines);
  const forSettle = lines.map((l) => ({
    unitPrice: l.unitPrice,
    qty: l.qty,
    amount: l.amount,
    gotQty: l.gotQty,
    status: l.status as LineItemStatus,
  }));

  const frozen = isFrozen(s.status as SettlementStatus);
  // 未結單時金額是即時算的；結單後顯示凍結進資料庫的那份，
  // 因為那才是通知給客人的數字。
  const totals = frozen
    ? {
        grossAmount: s.grossAmount,
        deductAmount: s.deductAmount,
        adjustAmount: s.adjustAmount,
        shippingFee: s.shippingFee,
        creditApplied: s.creditApplied,
        payableAmount: s.payableAmount,
        paidAmount: s.paidAmount,
        balance: s.payableAmount - s.paidAmount,
        itemCount: 0,
      }
    : settleTotals({
        lines: forSettle,
        shippingFee: s.shippingFee,
        adjustAmount: s.adjustAmount,
        creditApplied: s.creditApplied,
        paidAmount: s.paidAmount,
      });

  const ledger = await memberLedgerEntries(tenant.slug, s.memberId);
  const credit = memberCredit(ledger.map((e) => ({ kind: e.kind as never, amount: e.amount })));
  const origin = tenantOrigin(tenant);
  const url = `${origin}/s/${s.lookupToken}`;

  const shortItems = lines
    .map((l) => ({ l, st: settleLine({ ...l, status: l.status as LineItemStatus }) }))
    .filter(({ l, st }) => st.effectiveQty < l.qty)
    .map(({ l, st }) => ({
      name: l.name,
      optionLabel: l.optionLabel,
      qty: l.qty,
      effectiveQty: st.effectiveQty,
      status: l.status,
    }));

  const ship = s.orders.at(-1);

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{s.member.name ?? "（未填姓名）"}</h1>
          <p className="p-sub">
            {s.batch.title}・{s.id}・
            {SETTLEMENT_STATUS_ZH[s.status as SettlementStatus] ?? s.status}
            <br />
            {s.member.phoneDigits}
            {s.member.lineId ? `・LINE ${s.member.lineId}` : ""}
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber/settlements">
            回列表
          </a>
          <a className="p-btn p-btn-ghost" href={url} target="_blank" rel="noreferrer">
            看客人版
          </a>
        </div>
      </div>

      {sp.error && <div className="p-error">{ERRORS[sp.error] ?? "操作失敗。"}</div>}

      {/* ── 對帳鏈 ─────────────────────────────────────── */}
      <div className="p-dg-recon">
        <div className="p-dg-recon__row">
          <span>商品金額</span>
          <span>{twd(totals.grossAmount)}</span>
        </div>
        <div className="p-dg-recon__row">
          <span>缺貨／取消扣除</span>
          <span>−{twd(totals.deductAmount)}</span>
        </div>
        {totals.adjustAmount !== 0 && (
          <div className="p-dg-recon__row">
            <span>手動調整{s.adjustNote ? `（${s.adjustNote}）` : ""}</span>
            <span>
              {totals.adjustAmount > 0 ? "+" : "−"}
              {twd(Math.abs(totals.adjustAmount))}
            </span>
          </div>
        )}
        <div className="p-dg-recon__row">
          <span>運費（整張只收一次）</span>
          <span>{twd(totals.shippingFee)}</span>
        </div>
        {totals.creditApplied > 0 && (
          <div className="p-dg-recon__row">
            <span>折抵</span>
            <span>−{twd(totals.creditApplied)}</span>
          </div>
        )}
        <div className="p-dg-recon__row p-dg-recon__row--total">
          <span>應收</span>
          <span>{twd(totals.payableAmount)}</span>
        </div>
        <div className="p-dg-recon__row">
          <span>已收</span>
          <span>{twd(totals.paidAmount)}</span>
        </div>
        <div className="p-dg-recon__row p-dg-recon__row--total">
          <span>{totals.balance >= 0 ? "尚需收款" : "應退還客人"}</span>
          <span>{twd(Math.abs(totals.balance))}</span>
        </div>
        {credit > 0 && (
          <p className="p-dg-hint">這位客人另有 {twd(credit)} 的折抵餘額可用於下一檔。</p>
        )}
        {s.remitLast5 && (
          <p className="p-dg-hint">
            客人回報匯款末五碼 <strong>{s.remitLast5}</strong>
            {s.remitName ? `（${s.remitName}）` : ""}
            {s.remitAt ? `・${formatTaipei(s.remitAt)}` : ""}
          </p>
        )}
        {!frozen && (
          <p className="p-dg-hint">
            目前是<strong>即時計算</strong>。按下「結單」之後金額會凍結，
            之後行狀態再變動一律走「手動調整」，不會回頭改原始金額——
            那個數字已經通知給客人了。
          </p>
        )}
      </div>

      {/* ── 逐行狀態（需求第 14 項）───────────────────── */}
      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        品項（{lines.length}）
      </h2>
      <p className="p-dg-hint">
        一張訂單裡只有一樣缺貨時，只改那一行就好，其餘照出。
        金額不會被就地修改——扣多少是由狀態推導出來的。
      </p>

      {s.orders.map((o) => (
        <div key={o.id} style={{ marginTop: "1rem" }}>
          <p className="p-dg-hint">
            {formatTaipei(o.createdAt, { withTime: false })}　訂單 {o.id}
            {o.source === "manual" ? "　（代客下單）" : ""}
            {o.batchId !== s.batchId ? "　（他檔期併入）" : ""}
          </p>
          {o.lines.map((l) => {
            const st = settleLine({ ...l, status: l.status as LineItemStatus });
            return (
              <div key={l.id} className="p-dg-line">
                <div className="p-dg-line__main">
                  <strong>{l.name}</strong>
                  {l.optionLabel ? `（${l.optionLabel}）` : ""}
                  <div className="p-dg-hint">
                    {twd(l.unitPrice)} × {l.qty}
                    {st.effectiveQty !== l.qty ? ` → 實際 ${st.effectiveQty}` : ""}
                    　現況：{LINE_STATUS_ZH[l.status as LineItemStatus]}
                    {st.deduct > 0 ? `　扣除 ${twd(st.deduct)}` : ""}
                  </div>
                </div>
                <form method="post" action="/api/portal/amber/line-status" className="p-dg-line__acts">
                  <input type="hidden" name="lineId" value={l.id} />
                  <input type="hidden" name="settlementId" value={s.id} />
                  <input
                    type="text"
                    inputMode="numeric"
                    name="gotQty"
                    defaultValue={l.gotQty ?? ""}
                    placeholder={`買到（最多 ${l.qty}）`}
                    aria-label="實際買到幾件"
                    style={{ width: 90 }}
                  />
                  {LINE_STATUSES.filter((x) => x !== l.status).map((x) => (
                    <button key={x} type="submit" name="status" value={x} className="p-btn p-btn-ghost">
                      {LINE_STATUS_ZH[x]}
                    </button>
                  ))}
                </form>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── 通知文字 ───────────────────────────────────── */}
      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        通知文字
      </h2>
      <p className="p-dg-hint">複製後切到 LINE 貼給這位客人。請款通知在結單列表那一頁。</p>

      {shortItems.length > 0 && (
        <CopyBlock
          label="缺貨通知（個別）"
          text={shortageNoticeText({
            memberName: s.member.name ?? "您好",
            batchTitle: s.batch.title,
            items: shortItems,
            totals,
            url,
          })}
        />
      )}
      <CopyBlock
        label="出貨通知"
        text={shippedNoticeText({
          memberName: s.member.name ?? "您好",
          batchTitle: s.batch.title,
          shipNo: s.shipNo,
          shipMethod:
            ship?.shipKind === "cvs"
              ? `${cvsBrandName(ship.shipCvsBrand)} ${ship.shipCvsStoreName ?? ""}`
              : SHIP_KIND_ZH.home,
          etaAt: s.etaAt,
          url,
        })}
      />

      {/* ── 動作 ───────────────────────────────────────── */}
      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        結單與收款
      </h2>

      {!frozen && (
        <form method="post" action="/api/portal/amber/settlement" style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="action" value="freeze" />
          <input type="hidden" name="id" value={s.id} />
          <button type="submit" className="p-btn">
            結單（凍結 {twd(totals.payableAmount)}）
          </button>
          <p className="p-dg-hint">凍結後就可以複製請款通知給客人了。</p>
        </form>
      )}

      <form method="post" action="/api/portal/amber/settlement" className="p-board-form">
        <input type="hidden" name="action" value="ledger" />
        <input type="hidden" name="id" value={s.id} />
        <div className="p-dg-field">
          <label htmlFor="l-amount">登錄金額</label>
          <input
            id="l-amount"
            type="text"
            inputMode="numeric"
            name="amount"
            placeholder={String(Math.max(0, totals.balance))}
          />
          <p className="p-dg-hint">
            部分收款是可以的（客人分兩次匯），這裡是流水帳不是開關。
          </p>
        </div>
        <div className="p-dg-field">
          <label htmlFor="l-last5">匯款末五碼（選填）</label>
          <input id="l-last5" type="text" inputMode="numeric" name="last5" />
        </div>
        <div className="p-actions">
          <button type="submit" name="kind" value="payment" className="p-btn">
            記為收款
          </button>
          <button type="submit" name="kind" value="refund" className="p-btn p-btn-ghost">
            記為退款
          </button>
          <button type="submit" name="kind" value="credit" className="p-btn p-btn-ghost">
            記為折抵下一單
          </button>
        </div>
      </form>

      {ledger.length > 0 && (
        <details className="p-dg-more">
          <summary>收退款紀錄（{ledger.length}）</summary>
          {ledger.map((e) => (
            <div key={e.id} className="p-dg-hint">
              {formatTaipei(e.at)}　{e.kind}　{twd(e.amount)}
              {e.last5 ? `　末五碼 ${e.last5}` : ""}
              {e.note ? `　${e.note}` : ""}
            </div>
          ))}
        </details>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
        出貨
      </h2>
      <form method="post" action="/api/portal/amber/settlement" className="p-board-form">
        <input type="hidden" name="action" value="shipping" />
        <input type="hidden" name="id" value={s.id} />
        <div className="p-dg-field">
          <label htmlFor="sh-fee">運費</label>
          <input id="sh-fee" type="text" inputMode="numeric" name="shippingFee" defaultValue={s.shippingFee} />
        </div>
        <div className="p-dg-field">
          <label htmlFor="sh-no">貨態編號</label>
          <input id="sh-no" type="text" name="shipNo" defaultValue={s.shipNo ?? ""} />
        </div>
        <div className="p-dg-field">
          <label htmlFor="sh-eta">預計到貨日</label>
          <input
            id="sh-eta"
            type="date"
            name="etaAt"
            defaultValue={s.etaAt ? toTaipeiLocalInput(s.etaAt).slice(0, 10) : ""}
          />
        </div>
        <div className="p-dg-field">
          <label htmlFor="sh-adj">手動調整金額（可負）</label>
          <input id="sh-adj" type="text" inputMode="numeric" name="adjustAmount" defaultValue={s.adjustAmount} />
        </div>
        <div className="p-dg-field">
          <label htmlFor="sh-adjnote">調整原因</label>
          <input id="sh-adjnote" type="text" name="adjustNote" defaultValue={s.adjustNote ?? ""} />
          <p className="p-dg-hint">
            結單之後金額有變動就走這裡，不要回頭改原始金額——客人手上那個數字要對得起來。
          </p>
        </div>
        <button type="submit" className="p-btn">
          儲存出貨資訊
        </button>
      </form>

      <div className="p-actions" style={{ marginTop: "1rem" }}>
        {(["awaiting", "paid", "shipped", "done", "cancelled"] as SettlementStatus[])
          .filter((x) => x !== s.status)
          .map((x) => (
            <form key={x} method="post" action="/api/portal/amber/settlement">
              <input type="hidden" name="action" value="status" />
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="status" value={x} />
              <button type="submit" className="p-btn p-btn-ghost">
                標為{SETTLEMENT_STATUS_ZH[x]}
              </button>
            </form>
          ))}
      </div>

      {ship && (
        <>
          <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "1.8rem" }}>
            收件資料
          </h2>
          <div className="p-dg-recon">
            <div className="p-dg-recon__row">
              <span>收件人</span>
              <span>
                {ship.shipRecipient}　{ship.shipPhone}
              </span>
            </div>
            <div className="p-dg-recon__row">
              <span>方式</span>
              <span>
                {ship.shipKind === "cvs"
                  ? `${SHIP_KIND_ZH.cvs}｜${cvsBrandName(ship.shipCvsBrand)} ${ship.shipCvsStoreName ?? ""} ${ship.shipCvsStoreId ?? ""}`
                  : `${SHIP_KIND_ZH.home}｜${ship.shipAddress ?? ""}`}
              </span>
            </div>
            {s.orders.length > 1 && (
              <p className="p-dg-hint">
                以<strong>最後一筆訂單</strong>填的為準（客人中途改過的話，這裡是最新的）。
              </p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
