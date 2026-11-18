import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { REFERRAL_SERVICES, REWARD_VALID_MONTHS, referralService, rewardExpiresAt } from "@/lib/referral";

export { NOINDEX as metadata } from "@/lib/site-routes";
export const dynamic = "force-dynamic";

const ntd = (v: number) => `NT$${v.toLocaleString("en-US")}`;

export default async function ReferralAdmin({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await isAdmin())) return <main className="page-wrap"><Link href="/admin">請先登入營運後台</Link></main>;
  const query = await searchParams;
  const now = new Date();
  const rewards = await prisma.careReward.findMany({
    orderBy: [{ redeemedAt: "asc" }, { createdAt: "asc" }], take: 100,
    include: { referral: true },
  });
  const usable = rewards.filter((r) => !r.redeemedAt && now < rewardExpiresAt(r.createdAt)).length;
  const date = (d: Date | null) => d?.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }) ?? "—";
  return <main className="page-wrap" style={{ maxWidth: 1000 }}>
    <Link href="/admin" className="btn-ghost">返回營運後台</Link>
    <div className="mono-label" style={{ marginTop: "2rem" }}>REFERRAL</div>
    <h1 className="section-title">推薦獎勵・待兌現 {usable} 次</h1>
    <p className="care-required-note">
      每筆獎勵是「免費服務一次」，由客戶三選一，核發起 {REWARD_VALID_MONTHS} 個月內有效。
      客戶來信或 LINE 指定項目後安排製作，交付完成再於此登記；登記會寄一封完成通知給客戶。不涉及月費與綠界。
    </p>
    <ul className="prose-list">
      {REFERRAL_SERVICES.map((s) => <li key={s.key}>{s.zh.name}{s.value ? `（定價 ${ntd(s.value)}）` : ""}：{s.zh.desc}</li>)}
    </ul>
    {query.done && <p className="form-feedback ok">已登記交付；系統會嘗試寄送完成通知給客戶。</p>}
    {query.error && <p className="form-feedback err">登記失敗：請確認獎勵尚未使用、未過期，並填寫交付紀錄。</p>}
    {rewards.length === 0 && <p>目前沒有推薦獎勵。</p>}
    {rewards.map((r) => {
      const expires = rewardExpiresAt(r.createdAt);
      const expired = !r.redeemedAt && now >= expires;
      const service = referralService(r.service);
      return <section key={r.id} className="cart-summary" style={{ marginBottom: "1.5rem" }}>
        <h2 className="form-title" style={{ fontSize: "1.2rem", overflowWrap: "anywhere" }}>#{r.id}・{r.email}</h2>
        <p className="form-note">
          {r.side === "referrer" ? "推薦人" : "被推薦人"}・邀請碼 {r.referral.code}・成交訂單 {r.referral.orderId}・
          核發 {date(r.createdAt)}・有效至 {date(expires)}
        </p>
        {r.redeemedAt ? <>
          <p>已交付：{service?.zh.name ?? r.service}（{date(r.redeemedAt)}）</p>
          <p className="form-note">交付紀錄：{r.note}</p>
        </> : expired ? <p className="care-required-note">已過期，未兌現。</p> : <form method="post" action="/api/admin/referral-rewards">
          <input type="hidden" name="id" value={r.id} />
          <div className="form-group">
            <label className="form-label" htmlFor={`reward-service-${r.id}`}>客戶選擇的服務</label>
            <select className="form-input" id={`reward-service-${r.id}`} name="service" required defaultValue="">
              <option value="" disabled>請選擇</option>
              {REFERRAL_SERVICES.map((s) => <option key={s.key} value={s.key}>{s.zh.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor={`reward-note-${r.id}`}>交付紀錄（做了什麼、交給誰、在哪個網站）</label>
            <input className="form-input" id={`reward-note-${r.id}`} name="note" required minLength={2} maxLength={500} />
          </div>
          <label className="form-note"><input type="checkbox" name="confirmed" value="yes" required /> 服務已完成並交付給客戶。</label>
          <div style={{ marginTop: "1rem" }}><button className="btn-primary" type="submit">登記已交付</button></div>
        </form>}
      </section>;
    })}
    {rewards.length === 100 && <p className="form-note">顯示前 100 筆，未使用的優先。</p>}
  </main>;
}
