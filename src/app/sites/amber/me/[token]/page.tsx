import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getMemberByToken, listSettlements, memberLedgerEntries } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { tenantOrigin, getTenant } from "@/lib/tenants";
import { twd } from "../../_data/cart";
import {
  settleTotals,
  settlementTotalsFor,
  memberCredit,
  SETTLEMENT_STATUS_ZH,
  type LineItemStatus,
  type SettlementStatus,
} from "../../_data/settle";
import { maskName, maskPhone } from "../../_data/member";
import { SITE, TENANT_SLUG } from "../../_data/site";
import { RememberMe } from "../../_components/RememberMe";
import { ShareLine, ShareCopy } from "../../_components/ShareLine";
import { keepForMeText } from "@/lib/line-share";

// 「我的訂單」。
//
// 這一頁是「不用簡訊、不用密碼、不用 LINE Login」的身分方案的落腳處：
// 客人第一次下單拿到一條不可猜的連結，傳給自己或存進 LINE 記事本，
// 之後隨時查得到所有的單。連線期間下三次單就有三個訂單編號，一定會弄丟。
//
// ⚠ 連結即憑證：誰拿到誰看得到。所以個資一律遮罩——萬一被轉貼到群組，
// 外洩的是「有下單」這件事，不是完整住址。要看完整內容仍要走
// 「編號＋手機」的驗證路徑。

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的訂單",
  // 不可猜的連結不代表可以被索引
  robots: { index: false, follow: false },
};

export default async function MePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const member = await getMemberByToken(TENANT_SLUG, token);
  if (!member) notFound();

  const [settlements, ledger] = await Promise.all([
    listSettlements(TENANT_SLUG, { memberId: member.id, take: 50 }),
    memberLedgerEntries(TENANT_SLUG, member.id),
  ]);
  const credit = memberCredit(ledger.map((e) => ({ kind: e.kind as never, amount: e.amount })));

  const origin = tenantOrigin(getTenant(TENANT_SLUG)!);
  const myUrl = `${origin}/me/${token}`;

  return (
    <div className="am-wrap">
      {/* 同一台裝置下次直接從頁首進來，不必再點連結 */}
      <RememberMe path={`/me/${token}`} />

      <h1 className="am-h1">我的訂單</h1>
      <p className="am-sub">
        {maskName(member.name)}　{maskPhone(member.phoneDigits)}
      </p>

      <div className="am-note">
        <strong>把這個頁面留起來</strong>
        <p style={{ margin: "0.3rem 0 0.6rem" }}>
          用 LINE 傳給自己，或加入手機主畫面。之後查訂單、看金額、回報匯款都從這裡進去，
          不用記訂單編號。
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <ShareLine
            text={keepForMeText(SITE.shortName)}
            url={myUrl}
            label="用 LINE 傳給自己"
            className="am-btn am-btn--accent"
          />
          <ShareCopy url={myUrl} />
        </div>
      </div>

      {credit > 0 && (
        <div className="am-note">
          你有 <strong>{twd(credit)}</strong> 的折抵餘額，下一次結單時會自動扣除。
        </div>
      )}

      {settlements.length === 0 ? (
        <p className="am-empty">目前還沒有訂單。</p>
      ) : (
        settlements.map((s) => {
          const lines = s.orders.flatMap((o) => o.lines);
          const totals = settlementTotalsFor({
      ...s,
      lines: lines.map((l) => ({
        unitPrice: l.unitPrice,
        qty: l.qty,
        amount: l.amount,
        gotQty: l.gotQty,
        status: l.status as LineItemStatus,
      })),
    });
          const open = s.status === "open";

          return (
            <div className="am-sum" key={s.id} style={{ marginBottom: "1rem" }}>
              <div className="am-sum__row">
                <span>
                  <strong>{s.batch.title}</strong>
                </span>
                <span>{SETTLEMENT_STATUS_ZH[s.status as SettlementStatus] ?? s.status}</span>
              </div>
              <div className="am-sum__row">
                <span>{s.orders.length} 筆訂單・{lines.length} 個品項</span>
                <span>{formatTaipei(s.createdAt, { withTime: false })}</span>
              </div>
              {s.etaAt && (
                <div className="am-sum__row">
                  <span>預計到貨</span>
                  <span>{formatTaipei(s.etaAt, { withTime: false })}</span>
                </div>
              )}
              {s.shipNo && (
                <div className="am-sum__row">
                  <span>貨態編號</span>
                  <span>{s.shipNo}</span>
                </div>
              )}
              <div className="am-sum__row am-sum__row--total">
                <span>{open ? "預估金額" : "應付金額"}</span>
                <span>{twd(totals.payableAmount)}</span>
              </div>
              {totals.paidAmount > 0 && (
                <div className="am-sum__row am-sum__row--minus">
                  <span>已付</span>
                  <span>−{twd(totals.paidAmount)}</span>
                </div>
              )}

              <a
                className={`am-btn ${!open && totals.balance > 0 ? "am-btn--accent" : "am-btn--ghost"} am-btn--full`}
                style={{ marginTop: "0.6rem" }}
                href={`/s/${s.lookupToken}`}
              >
                {open
                  ? "看明細"
                  : totals.balance > 0
                    ? `看明細並回報匯款（還需 ${twd(totals.balance)}）`
                    : "看明細"}
              </a>
            </div>
          );
        })
      )}

      <p className="am-field__hint">
        為了保護個資，這一頁只顯示部分資料。
        <a href="/order/lookup">用訂單編號＋手機查詢</a>可以看到完整內容。
      </p>
    </div>
  );
}
