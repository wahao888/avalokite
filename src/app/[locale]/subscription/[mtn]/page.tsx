import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { careOptionsFor, earlyExitFee, fmt, getProduct, prepaidPeriodsFor } from "@/lib/products";
import { findSubscription } from "@/lib/subscription";
import type { Locale } from "@/i18n/routing";
import SubscriptionActions from "@/components/SubscriptionActions";

export { NOINDEX as metadata } from "@/lib/site-routes";

export const dynamic = "force-dynamic";

// 客戶自助管理訂閱。網址裡的 MerchantTradeNo 即為存取憑證（同 /api/pay/[mtn]），
// 連結只出現在寄給該客戶的信與訂單查詢結果中。
export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; mtn: string }>;
  searchParams: Promise<{ done?: string; err?: string }>;
}) {
  const { locale, mtn } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "sub" });
  const { done, err } = await searchParams;
  const lc = locale as Locale;

  const sub = /^[A-Z0-9]{4,20}$/.test(mtn) ? await findSubscription(mtn) : null;

  if (!sub) {
    return (
      <main className="page-wrap page-wrap-narrow" style={{ textAlign: "center" }}>
        <h1 className="section-title">{t("notFound")}</h1>
        <p className="section-intro">{t("notFoundDesc")}</p>
        <Link href="/order/lookup" className="btn-ghost">{t("toLookup")}</Link>
      </main>
    );
  }

  const planNames = sub.sku
    .split("+")
    .map((s) => getProduct(s)?.i18n[lc].name ?? s)
    .join(" + ");
  const orderSkus = (JSON.parse(sub.order.items) as { sku: string }[]).map((i) => i.sku);
  // 換方案的可選範圍與購物車一致：促銷建置只能在促銷維護裡換
  const options = careOptionsFor(orderSkus).filter((p) => p.sku !== sub.sku);
  const ended = sub.status === "cancelled" || sub.status === "replaced";
  // 補償金額看的是「已完成幾期」，不是日曆月：客戶付了幾期就攤掉了幾期的建置費。
  // 下單時的席次保留金也是實付的一期，一併計入，否則客戶會被多算一期的補償。
  const prepaid = prepaidPeriodsFor(orderSkus);
  const exitFee = earlyExitFee(sub.totalSuccessTimes + prepaid);
  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString(lc === "en" ? "en-US" : "zh-TW", { timeZone: "Asia/Taipei" }) : "-";

  return (
    <main className="page-wrap page-wrap-narrow">
      <div className="mono-label">SUBSCRIPTION</div>
      <h1 className="section-title">{t("title")}</h1>

      {done === "cancel" && <div className="form-feedback ok">{t("cancelled")}</div>}
      {err && (
        <div className="form-feedback err">
          {err === "ecpay" || err === "ecpay-cancel-failed" ? t("errEcpay") : t("errGeneric")}
        </div>
      )}

      <div className="cart-summary" style={{ marginTop: "2rem" }}>
        <div className="cart-summary-row total" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
          <span>{planNames}</span>
          <span className="amount">
            NT${fmt(sub.monthlyAmount)}
            <span style={{ fontSize: "0.7rem" }}>{lc === "en" ? "/mo" : "/月"}</span>
          </span>
        </div>
        <div className="cart-summary-row">
          <span>{t("status")}</span>
          <span className={`badge ${sub.status}`}>{t(`state.${sub.status}`)}</span>
        </div>
        <div className="cart-summary-row">
          <span>{t("orderNo")}</span>
          <span>{sub.orderId}</span>
        </div>
        <div className="cart-summary-row">
          <span>{t("charged")}</span>
          <span>{t("times", { n: sub.totalSuccessTimes })}{sub.lastChargeAt ? `・${fmtDate(sub.lastChargeAt)}` : ""}</span>
        </div>
        {sub.commitEndsAt && (
          <div className="cart-summary-row">
            <span>{t("commitment")}</span>
            <span>
              {/* 保留金已付掉一期，扣款結束日會比「24 個月」早一個月。
                  直接寫「24 個月・至 <23 個月後>」會被讀成算錯，所以分開講。 */}
              {t(prepaid > 0 ? "commitUntilPrepaid" : "commitUntil", {
                months: sub.termMonths ?? 0,
                date: fmtDate(sub.commitEndsAt),
              })}
            </span>
          </div>
        )}
        {/* 承諾期內提前終止要補多少，先算給客戶看。藏起來只會換到一次爭議。 */}
        {sub.commitEndsAt && sub.commitEndsAt > new Date() && exitFee > 0 && (
          <div className="cart-summary-row">
            <span>{t("earlyExit")}</span>
            <span>NT${fmt(exitFee)}</span>
          </div>
        )}
        <div className="cart-monthly-note">✦ {t("taxNote")}</div>
      </div>

      {ended ? (
        <p className="care-required-note" style={{ marginTop: "2rem" }}>
          {sub.status === "replaced" ? t("replacedNote") : t("cancelledNote")}
        </p>
      ) : sub.status === "pending" && !sub.launchedAt ? (
        // 網站還沒上線＝月費還沒開始，這頁不該出現任何「立即授權」的入口。
        // 客戶自己找到這個連結時，要讀到的是「你還不用付」，不是一顆付款按鈕。
        <div style={{ marginTop: "2.5rem" }}>
          <div className="cart-section-head">{t("notLiveHeading")}</div>
          <p className="care-required-note">{t("notLiveNote")}</p>
        </div>
      ) : sub.status === "pending" ? (
        <div style={{ marginTop: "2.5rem" }}>
          <div className="cart-section-head">{t("pendingHeading")}</div>
          <p className="care-required-note">{t("pendingNote")}</p>
          <a href={`/api/pay/${sub.merchantTradeNo}`} className="btn-primary">{t("authorizeNow")}</a>
        </div>
      ) : (
        <SubscriptionActions
          mtn={sub.merchantTradeNo}
          currentPrice={sub.monthlyAmount}
          options={options.map((p) => ({
            sku: p.sku,
            name: p.i18n[lc].name,
            desc: p.i18n[lc].desc,
            price: p.price,
          }))}
          committed={!!sub.commitEndsAt && sub.commitEndsAt > new Date()}
          labels={{
            changeHeading: t("changeHeading"),
            changeNote: t("changeNote"),
            changeSubmit: t("changeSubmit"),
            changeConfirm: t("changeConfirm"),
            cardHeading: t("cardHeading"),
            cardNote: t("cardNote"),
            cardSubmit: t("cardSubmit"),
            cardConfirm: t("cardConfirm"),
            cancelHeading: t("cancelHeading"),
            cancelNote: t("cancelNote"),
            cancelSubmit: t("cancelSubmit"),
            cancelConfirm: t("cancelConfirm"),
            cancelCommitted: t("cancelCommitted"),
            perMonth: lc === "en" ? "/mo" : "/月",
          }}
        />
      )}

      <p className="cart-monthly-note" style={{ marginTop: "2.5rem" }}>
        {t("help")}
      </p>
    </main>
  );
}
