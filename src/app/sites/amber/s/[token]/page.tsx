import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getSettlementByToken } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { shortOrderCode } from "@/lib/shop-order-id";
import { thumbUrl } from "@/lib/media-url";
import { twd } from "../../_data/cart";
import {
  settleTotals,
  settlementTotalsFor,
  settleLine,
  LINE_STATUS_ZH,
  SETTLEMENT_STATUS_ZH,
  type LineItemStatus,
  type SettlementStatus,
} from "../../_data/settle";
import { maskName, maskPhone, maskAddress, normalizePhone } from "../../_data/member";
import { BANK, LINEPAY, bankReady, linePayReady, SHIP_KIND_ZH, cvsBrandName, TENANT_SLUG } from "../../_data/site";
import { CopyText } from "../../_components/CopyText";
import { RemitForm } from "../../_components/RemitForm";
import { Terms } from "../../_components/Terms";
import {
  IconBank,
  IconCalendar,
  IconInfo,
  IconPin,
  IconPlane,
  IconReceipt,
  IconTruck,
} from "../../_components/Icons";

// 結單頁。客人這一側唯一的出口：他是靠這一頁知道自己要付多少錢的。
//
// 網址帶的是 22 字元的不可猜 token，所以客人一點連結就看得到，
// 不必輸入編號＋手機（那是弄丟連結時的備援路徑）。
//
// ⚠ 個資做遮罩。這個連結可能被轉貼到群組——姓名、電話、地址都只顯示部分。
// 想看完整內容要走「編號＋手機」的驗證路徑。
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "結單明細",
  // 不可猜的連結不代表可以被索引
  robots: { index: false, follow: false },
};

export default async function SettlementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const s = await getSettlementByToken(TENANT_SLUG, token);
  if (!s) notFound();

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

  const status = s.status as SettlementStatus;
  const open = status === "open";
  const ship = s.orders.at(-1); // 收件資料以最後一筆訂單為準（客人可能中途改過）

  return (
    <div className="am-wrap">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconReceipt size={14} stroke={2} />
          結單明細
        </p>
        <h1>{s.batch.title}</h1>
        <p>{SETTLEMENT_STATUS_ZH[status] ?? status}</p>
      </header>

      <div className="am-code">
        <span className="am-code__label">訂單編號</span>
        <span className="am-code__value">{shortOrderCode(s.id)}</span>
        <span className="am-code__full">{s.id}</span>
      </div>

      {open && (
        <div className="am-note">
          <div className="am-note__h">
            <IconInfo size={16} stroke={1.9} />
            這一檔還在收單中
          </div>
          下面的金額是<strong>目前的預估</strong>。收單並採購完成後我們會通知你最終金額。
        </div>
      )}

      {/* 桌機雙欄：左邊是「買了什麼」，右邊是「要付多少、怎麼付」。
          手機仍是單欄，順序不變（品項 → 對帳 → 付款 → 出貨）。 */}
      <div className="am-cols am-cols--flow">
        <div>
      {/* 品項。逐筆訂單分開列——「9/15 那筆」「9/16 那筆」對客人才有意義 */}
      {s.orders.map((o) => (
        <div key={o.id} style={{ marginBottom: "1rem" }}>
          <p className="am-sub" style={{ margin: "0 0 0.3rem" }}>
            <IconCalendar size={14} stroke={1.9} />{" "}
            {formatTaipei(o.createdAt, { withTime: false })} 訂單 {o.id}
          </p>
          {o.lines.map((l) => {
            const st = settleLine({
              unitPrice: l.unitPrice,
              qty: l.qty,
              amount: l.amount,
              gotQty: l.gotQty,
              status: l.status as LineItemStatus,
            });
            const shorted = st.effectiveQty < l.qty;
            return (
              <div className={`am-line${shorted ? " am-line--blocked" : ""}`} key={l.id}>
                {l.imageKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl(l.imageKey)} alt="" width={60} height={60} loading="lazy" />
                ) : (
                  <img alt="" width={60} height={60} />
                )}
                <div className="am-line__main">
                  <div className="am-line__name">{l.name}</div>
                  {l.optionLabel && <div className="am-line__spec">{l.optionLabel}</div>}
                  <div className="am-line__spec">
                    {twd(l.unitPrice)} × {l.qty}
                    {shorted ? `　→ 實際 ${st.effectiveQty}` : ""}
                    {l.status !== "ordered" ? `　${LINE_STATUS_ZH[l.status as LineItemStatus]}` : ""}
                  </div>
                </div>
                <div className="am-line__amt">{twd(st.effectiveAmount)}</div>
              </div>
            );
          })}
        </div>
      ))}

        </div>

        <aside className="am-cols__side">
      {/* 對帳鏈。原始金額 → 缺貨扣除 → 調整 → 運費 → 折抵 → 應付 → 已收 */}
      <div className="am-sum">
        <div className="am-sum__row">
          <span>商品金額</span>
          <span>{twd(totals.grossAmount)}</span>
        </div>
        {totals.deductAmount > 0 && (
          <div className="am-sum__row am-sum__row--minus">
            <span>缺貨／取消扣除</span>
            <span>−{twd(totals.deductAmount)}</span>
          </div>
        )}
        {totals.adjustAmount !== 0 && (
          <div className="am-sum__row">
            <span>金額調整{s.adjustNote ? `（${s.adjustNote}）` : ""}</span>
            <span>
              {totals.adjustAmount > 0 ? "+" : "−"}
              {twd(Math.abs(totals.adjustAmount))}
            </span>
          </div>
        )}
        {totals.shippingFee > 0 && (
          <div className="am-sum__row">
            <span>運費（整張結單只收一次）</span>
            <span>{twd(totals.shippingFee)}</span>
          </div>
        )}
        {totals.creditApplied > 0 && (
          <div className="am-sum__row am-sum__row--minus">
            <span>上次缺貨折抵</span>
            <span>−{twd(totals.creditApplied)}</span>
          </div>
        )}
        <div className="am-sum__row am-sum__row--total">
          <span>{open ? "預估應付" : "應付金額"}</span>
          <span>{twd(totals.payableAmount)}</span>
        </div>
        {totals.paidAmount > 0 && (
          <>
            <div className="am-sum__row am-sum__row--minus">
              <span>已收款</span>
              <span>−{twd(totals.paidAmount)}</span>
            </div>
            <div className="am-sum__row">
              <span>{totals.balance >= 0 ? "尚需補款" : "應退還你"}</span>
              <span>{twd(Math.abs(totals.balance))}</span>
            </div>
          </>
        )}
      </div>

      {/* 付款資訊。未填時退成「我們會與你聯絡」，不顯示空欄位 */}
      {!open && totals.balance > 0 && (
        <>
          <h2 className="am-h2" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
            <IconBank size={17} stroke={1.9} /> 付款方式
          </h2>
          {bankReady() ? (
            <div className="am-note">
              <div>
                <strong>{BANK.bankName}</strong>
                {BANK.bankCode ? `（${BANK.bankCode}）` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.3rem" }}>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{BANK.account}</span>
                <CopyText value={BANK.account} label="複製帳號" />
              </div>
              {BANK.holder && <div className="am-line__spec">戶名 {BANK.holder}</div>}
            </div>
          ) : null}
          {linePayReady() ? (
            <div className="am-note">
              LINE Pay：
              {LINEPAY.payLink ? <a href={LINEPAY.payLink}>點此付款</a> : `請私訊 ${LINEPAY.lineId}`}
            </div>
          ) : null}
          {!bankReady() && !linePayReady() && (
            <div className="am-note">付款方式我們會另外用 LINE 通知你。</div>
          )}

          <h2 className="am-h2" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
            匯款回報
          </h2>
          <RemitForm token={token} reported={s.remitLast5} />
        </>
      )}

      {/* 出貨資訊 */}
      <h2 className="am-h2" style={{ fontSize: "1.05rem", marginTop: "1.5rem" }}>
        <IconTruck size={17} stroke={1.9} /> 出貨資訊
      </h2>
      <div className="am-sum">
        {s.etaAt && (
          <div className="am-sum__row">
            <span>
              <IconPlane size={14} stroke={1.9} /> 預計到貨
            </span>
            <span>{formatTaipei(s.etaAt, { withTime: false })}</span>
          </div>
        )}
        {s.shipNo && (
          <div className="am-sum__row">
            <span>
              <IconTruck size={14} stroke={1.9} /> 貨態編號
            </span>
            <span>{s.shipNo}</span>
          </div>
        )}
        {s.shippedAt && (
          <div className="am-sum__row">
            <span>出貨時間</span>
            <span>{formatTaipei(s.shippedAt)}</span>
          </div>
        )}
        {ship && (
          <>
            <div className="am-sum__row">
              <span>收件人</span>
              {/* 遮罩：這個連結可能被轉貼到群組 */}
              <span>
                {maskName(ship.shipRecipient)}　{maskPhone(normalizePhone(ship.shipPhone))}
              </span>
            </div>
            <div className="am-sum__row">
              <span>
                <IconPin size={14} stroke={1.9} /> 取貨方式
              </span>
              <span>
                {ship.shipKind === "cvs"
                  ? `${SHIP_KIND_ZH.cvs}｜${cvsBrandName(ship.shipCvsBrand)} ${ship.shipCvsStoreName ?? ""}`
                  : `${SHIP_KIND_ZH.home}｜${maskAddress(ship.shipAddress)}`}
              </span>
            </div>
          </>
        )}
      </div>
      <p className="am-field__hint" style={{ marginTop: "0.6rem" }}>
        為了保護個資，這一頁只顯示部分收件資料。有誤請直接在 LINE 告訴我們。
      </p>
        </aside>
      </div>

      <Terms compact />
    </div>
  );
}
