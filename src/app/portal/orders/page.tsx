import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import {
  countShopOrders,
  listShopOrders,
  PAGE_SIZE,
  SHOP_STATUS_ZH,
  isShopStatus,
} from "@/lib/tenant-data";
import LoginForm from "../LoginForm";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(d);

const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

const PAY_ZH: Record<string, string> = {
  transfer: "匯款",
  linepay: "LINE Pay",
  cod: "貨到付款",
};

/** items 是 JSON 字串。壞掉的話回空陣列——一筆資料髒掉不該讓整個列表 500。 */
function itemCount(json: string): number {
  try {
    const v: unknown = JSON.parse(json);
    if (!Array.isArray(v)) return 0;
    return v.reduce<number>((a, x) => a + (typeof (x as { qty?: unknown })?.qty === "number" ? (x as { qty: number }).qty : 0), 0);
  } catch {
    return 0;
  }
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  // 沒開線上商店的租戶不該看到這一頁
  if (!hostTenant.shop) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const onlyOpen = sp.filter === "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, shown, total, open] = await Promise.all([
    listShopOrders(tenant.slug, { skip: (page - 1) * PAGE_SIZE, onlyOpen }),
    countShopOrders(tenant.slug, { onlyOpen }),
    countShopOrders(tenant.slug),
    countShopOrders(tenant.slug, { onlyOpen: true }),
  ]);
  const pages = Math.max(1, Math.ceil(shown / PAGE_SIZE));
  const qs = (p: number) => `/portal/orders?page=${p}${onlyOpen ? "&filter=open" : ""}`;

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{tenant.name}・訂單管理</h1>
          <p className="p-sub">網站送出的訂單都會列在這裡，並即時寄到你的信箱。</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal">
            表單管理
          </a>
          <form method="post" action="/api/portal/logout">
            <button type="submit" className="p-btn-link">
              登出
            </button>
          </form>
        </div>
      </div>

      <div className="p-stats">
        <div className="p-stat">
          待出貨<b>{open}</b>
        </div>
        <div className="p-stat">
          全部<b>{total}</b>
        </div>
      </div>

      <div className="p-filters">
        <a href="/portal/orders" className={onlyOpen ? "" : "on"}>
          全部
        </a>
        <a href="/portal/orders?filter=open" className={onlyOpen ? "on" : ""}>
          只看待出貨
        </a>
      </div>

      {rows.length === 0 ? (
        <div className="p-tablewrap">
          <p className="p-empty">{onlyOpen ? "沒有待出貨的訂單。" : "還沒有收到任何訂單。"}</p>
        </div>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>時間</th>
                <th>訂購人</th>
                <th>包數</th>
                <th>金額</th>
                <th>付款</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="p-nowrap">
                    <a href={`/portal/orders/${encodeURIComponent(o.id)}`}>{o.id}</a>
                  </td>
                  <td className="p-nowrap">{fmt(o.createdAt)}</td>
                  <td>
                    {o.name}
                    <br />
                    <small>{o.phone}</small>
                  </td>
                  <td>{itemCount(o.items)}</td>
                  <td className="p-nowrap">{twd(o.total)}</td>
                  <td className="p-nowrap">
                    {PAY_ZH[o.payment] ?? o.payment}
                    {o.remitLast5 ? (
                      <>
                        <br />
                        <small>末五碼 {o.remitLast5}</small>
                      </>
                    ) : null}
                  </td>
                  <td className="p-nowrap">
                    {isShopStatus(o.status) ? SHOP_STATUS_ZH[o.status] : o.status}
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
          <span>
            {page} / {pages}
          </span>
          {page < pages && <a href={qs(page + 1)}>下一頁 →</a>}
        </div>
      )}
    </main>
  );
}
