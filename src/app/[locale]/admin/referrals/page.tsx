import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { referralEmail } from "@/lib/referral";

export { NOINDEX as metadata } from "@/lib/site-routes";
export const dynamic = "force-dynamic";

export default async function ReferralAdmin({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isAdmin())) return <main className="page-wrap"><Link href="/admin">請先登入營運後台</Link></main>;
  const query = await searchParams;
  const [rewards, subscriptions, pending] = await Promise.all([
    prisma.careReward.findMany({ orderBy: [{ redeemedAt: "asc" }, { createdAt: "desc" }], take: 100,
      include: { referral: { include: { order: true } } } }),
    prisma.subscription.findMany({ where: { status: "active", totalSuccessTimes: { gt: 0 }, pastDueSince: null }, include: { order: true } }),
    prisma.careReward.count({ where: { redeemedAt: null } }),
  ]);
  const date = (d: Date | null) => d?.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }) ?? "—";
  return <main className="page-wrap" style={{ maxWidth: 1000 }}>
    <Link href="/admin" className="btn-ghost">返回營運後台</Link>
    <div className="mono-label" style={{ marginTop: "2rem" }}>REFERRAL</div>
    <h1 className="section-title">推薦獎勵・待安排 {pending} 個月</h1>
    <p className="care-required-note">每筆獎勵是一個月免費維護。先在綠界廠商後台安排該期間不扣款及恢復扣款日，再填寫免費期間起日與核對紀錄。此處登記不會呼叫綠界修改排程，也不會延長綁約期。未訂閱者先保留，勿標記已使用。</p>
    {query.done && <p className="form-feedback ok">已登記免費月份；系統會嘗試寄送客戶通知。</p>}
    {query.error && <p className="form-feedback err">登記失敗：請確認獎勵尚未使用、訂閱歸屬、起日及核對紀錄；同一訂閱的免費期間不能重疊。</p>}
    {rewards.length === 0 && <p>目前沒有推薦獎勵。</p>}
    {rewards.map((r) => {
      const eligible = subscriptions.filter((s) => referralEmail(s.order.email) === r.email);
      return <section key={r.id} className="cart-summary" style={{ marginBottom: "1.5rem" }}>
        <h2 className="form-title" style={{ fontSize: "1.2rem", overflowWrap: "anywhere" }}>#{r.id}・{r.email}</h2>
        <p className="form-note">{r.side === "referrer" ? "介紹人" : "被介紹人"}・邀請碼 {r.referral.code}・成交訂單 {r.referral.orderId}・{date(r.createdAt)}</p>
        {r.redeemedAt ? <>
          <p>免費維護：{date(r.freeFrom)} 至 {date(r.freeUntil)}（到期日起恢復付費）</p>
          <p className="form-note">訂閱 {r.merchantTradeNo}・核對紀錄：{r.billingReference}</p>
        </> : eligible.length === 0 ? <p className="care-required-note">已保留 1 個月，等待有效維護訂閱。</p> : <form method="post" action="/api/admin/referral-rewards">
          <input type="hidden" name="id" value={r.id} />
          <div className="form-group">
            <label className="form-label" htmlFor={`reward-sub-${r.id}`}>使用的維護訂閱</label>
            <select className="form-input" id={`reward-sub-${r.id}`} name="mtn" required>
              {eligible.map((s) => <option key={s.id} value={s.merchantTradeNo}>{s.order.name}・{s.sku}・{s.merchantTradeNo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`reward-date-${r.id}`}>免費維護起日（台北時間，自此日起一個月）</label>
            <input className="form-input" id={`reward-date-${r.id}`} type="date" name="freeFrom" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`reward-proof-${r.id}`}>綠界排程核對紀錄（操作時間、恢復扣款日或紀錄編號）</label>
            <input className="form-input" id={`reward-proof-${r.id}`} name="billingReference" required minLength={5} maxLength={500} />
          </div>
          <label className="form-note"><input type="checkbox" name="confirmed" value="yes" required /> 已確認該月不扣款，並已安排後續恢復扣款。</label>
          <div style={{ marginTop: "1rem" }}><button className="btn-primary" type="submit">登記已安排免費月份</button></div>
        </form>}
      </section>;
    })}
    {rewards.length === 100 && <p className="form-note">顯示前 100 筆，未使用獎勵優先。</p>}
  </main>;
}
