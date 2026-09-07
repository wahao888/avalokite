import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { listMembers, listSettlements, memberLedgerEntries } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { twd } from "@/app/sites/amber/_data/cart";
import { memberCredit } from "@/app/sites/amber/_data/settle";
import LoginForm from "../../LoginForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  bad: "請選兩位不同的客人。",
  notfound: "找不到那位客人。",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; merged?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const members = await listMembers(tenant.slug, { q: sp.q, take: 200 });

  // 每位客人的折抵餘額與未付結單——這兩個是她最常想知道的
  const extra = await Promise.all(
    members.map(async (m) => {
      const [ledger, settlements] = await Promise.all([
        memberLedgerEntries(tenant.slug, m.id),
        listSettlements(tenant.slug, { memberId: m.id, take: 50 }),
      ]);
      const unpaid = settlements.filter(
        (s) => s.status === "awaiting" && s.paidAmount < s.payableAmount,
      );
      return {
        credit: memberCredit(ledger.map((e) => ({ kind: e.kind as never, amount: e.amount }))),
        settlements: settlements.length,
        unpaid: unpaid.reduce((n, s) => n + (s.payableAmount - s.paidAmount), 0),
      };
    }),
  );

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">客人</h1>
          <p className="p-sub">用手機號碼歸戶。同一個人有兩筆資料時可以合併。</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber">
            連線管理
          </a>
        </div>
      </div>

      {sp.merged && <div className="p-note">已合併。訂單、結單與收款紀錄都已經挪過去了。</div>}
      {sp.error && <div className="p-error">{ERRORS[sp.error] ?? "操作失敗。"}</div>}

      <form method="get" className="p-dg-field">
        <label htmlFor="q">搜尋（姓名／手機／LINE）</label>
        <input id="q" type="text" name="q" defaultValue={sp.q ?? ""} />
      </form>

      {members.length === 0 ? (
        <p className="p-empty">還沒有客人。</p>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>手機</th>
                <th>LINE</th>
                <th>結單</th>
                <th>未付</th>
                <th>折抵餘額</th>
                <th>首次購買</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} className={m.blocked ? "done" : ""}>
                  <td>
                    {m.name ?? "（未填）"}
                    {m.blocked ? "・已封鎖" : ""}
                  </td>
                  <td className="p-nowrap">{m.phoneDigits}</td>
                  <td>{m.lineId ?? m.lineDisplayName ?? "—"}</td>
                  <td className="p-nowrap">{extra[i].settlements}</td>
                  <td className="p-nowrap">
                    {extra[i].unpaid > 0 ? twd(extra[i].unpaid) : "—"}
                  </td>
                  <td className="p-nowrap">{extra[i].credit > 0 ? twd(extra[i].credit) : "—"}</td>
                  <td className="p-nowrap">{formatTaipei(m.createdAt, { withTime: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="p-title" style={{ fontSize: "1.1rem", marginTop: "2rem" }}>
        合併客人
      </h2>
      <p className="p-dg-hint">
        同一個人用了兩支手機、或幫家人代訂而分成兩筆時用這個。
        A 的訂單、結單與收款紀錄都會挪到 B 底下，A 保留一筆註記（不會真的刪掉）。
      </p>
      <form method="post" action="/api/portal/amber/member" className="p-board-form">
        <input type="hidden" name="action" value="merge" />
        <div className="p-dg-field">
          <label htmlFor="from">把這一位（A）</label>
          <select id="from" name="fromId" required>
            <option value="">請選擇</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? "（未填）"}　{m.phoneDigits}
              </option>
            ))}
          </select>
        </div>
        <div className="p-dg-field">
          <label htmlFor="into">併入這一位（B，保留的那個）</label>
          <select id="into" name="intoId" required>
            <option value="">請選擇</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? "（未填）"}　{m.phoneDigits}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="p-btn">
          合併
        </button>
      </form>
    </main>
  );
}
