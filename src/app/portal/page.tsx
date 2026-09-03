import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { countInquiries, listInquiries, PAGE_SIZE } from "@/lib/tenant-data";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(d);

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; error?: string }>;
}) {
  const sp = await searchParams;

  // 未登入時仍要知道是哪一家，才能在登入畫面顯示品牌
  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const onlyUnhandled = sp.filter === "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, shown, total, open] = await Promise.all([
    listInquiries(tenant.slug, { skip: (page - 1) * PAGE_SIZE, onlyUnhandled }),
    countInquiries(tenant.slug, { onlyUnhandled }),
    countInquiries(tenant.slug),
    countInquiries(tenant.slug, { onlyUnhandled: true }),
  ]);
  const pages = Math.max(1, Math.ceil(shown / PAGE_SIZE));
  const qs = (p: number) =>
    `/portal?page=${p}${onlyUnhandled ? "&filter=open" : ""}`;

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{tenant.name}・表單管理</h1>
          <p className="p-sub">網站送出的詢問與估價單都會列在這裡，並即時寄到你的信箱。</p>
        </div>
        <div className="p-actions">
          {/* 有今日供應板的租戶才顯示（見 src/lib/tenants.ts 的 flavorBoard） */}
          {tenant.flavorBoard && (
            <a className="p-btn" href="/portal/board">今日口味</a>
          )}
          {/* 有線上商店的租戶才顯示（見 src/lib/tenants.ts 的 shop） */}
          {tenant.shop && (
            <>
              <a className="p-btn" href="/portal/orders">訂單管理</a>
              <a className="p-btn" href="/portal/beans">本期供應</a>
            </>
          )}
          <a className="p-btn p-btn-ghost" href="/api/portal/export">下載 CSV</a>
          <form method="post" action="/api/portal/logout">
            <button type="submit" className="p-btn-link">登出</button>
          </form>
        </div>
      </div>

      <div className="p-stats">
        <div className="p-stat">待處理<b>{open}</b></div>
        <div className="p-stat">全部<b>{total}</b></div>
      </div>

      <div className="p-filters">
        <a href="/portal" className={onlyUnhandled ? "" : "on"}>全部</a>
        <a href="/portal?filter=open" className={onlyUnhandled ? "on" : ""}>只看待處理</a>
      </div>

      {rows.length === 0 ? (
        <div className="p-tablewrap">
          <p className="p-empty">
            {onlyUnhandled ? "沒有待處理的表單。" : "還沒有收到任何表單。"}
          </p>
        </div>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>#</th>
                <th>送出時間</th>
                <th>聯絡人</th>
                <th>內容</th>
                <th>狀態</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.handled ? "done" : undefined}>
                  <td className="p-nowrap">
                    <a href={`/portal/${r.id}`}>{r.id}</a>
                  </td>
                  <td className="p-nowrap">
                    {fmt(r.createdAt)}
                    {/* 先落庫再寄信，所以就算 SMTP 掛掉，單子仍在這裡不會漏 */}
                    {!r.notified && <div className="p-warn">⚠ 通知信未送達</div>}
                  </td>
                  <td className="p-nowrap">
                    {r.name}
                    <div className="p-msg">{r.phone}</div>
                  </td>
                  <td>
                    <div className="p-msg">
                      {r.message.replace(/\s+/g, " ").slice(0, 90)}
                      {r.message.length > 90 ? "…" : ""}
                    </div>
                  </td>
                  <td className="p-nowrap">{r.handled ? "✓ 已處理" : "待處理"}</td>
                  <td className="p-nowrap">
                    <form method="post" action="/api/portal/handle">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="handled" value={r.handled ? "0" : "1"} />
                      <button type="submit" className="p-btn-link">
                        {r.handled ? "改回待處理" : "標記已處理"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="p-pager">
          {page > 1 && <a href={qs(page - 1)}>← 上一頁</a>}
          <span>{page} / {pages}</span>
          {page < pages && <a href={qs(page + 1)}>下一頁 →</a>}
        </div>
      )}
    </main>
  );
}
