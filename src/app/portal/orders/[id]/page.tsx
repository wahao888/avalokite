import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getShopOrder, SHOP_STATUSES, SHOP_STATUS_ZH, isShopStatus } from "@/lib/tenant-data";
import LoginForm from "../../LoginForm";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(d);

const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

// 付款方式的中文。刻意在後台自己留一份而不 import 客戶站的 _data——
// 後台是跨租戶共用的，不該跟任何一家客戶站的資料模組綁在一起。
const PAY_ZH: Record<string, string> = {
  transfer: "銀行匯款 / ATM",
  linepay: "LINE Pay",
  cod: "貨到付款",
};

/** 需要客人自行回報付款的方式（貨到付款不用） */
const NEEDS_REPORT = (p: string) => p === "transfer" || p === "linepay";

type Item = { name?: string; qty?: number; unitPrice?: number; amount?: number };

type BundleRow = { name?: string; label?: string; sets?: number; bundlePrice?: number; saved?: number };

/** items / bundles 是下單當下寫死的 JSON 快照，不回頭讀豆單——豆單改價後舊訂單仍對得起帳。 */
function parseJson<T>(json: string): T[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="p-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.shop) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} />;

  const { id } = await params;

  // getShopOrder 的 where 帶 tenantId：別家的單一律查不到，也不透露是否存在
  const o = await getShopOrder(tenant.slug, id);
  if (!o) notFound();

  const items = parseJson<Item>(o.items);
  const bundles = parseJson<BundleRow>(o.bundles);
  const status = isShopStatus(o.status) ? o.status : "pending";

  return (
    <main className="p-wrap">
      <a className="p-back" href="/portal/orders">
        ← 回訂單列表
      </a>

      <div className="p-head">
        <div>
          <h1 className="p-title">{o.id}</h1>
          <p className="p-sub">
            {fmt(o.createdAt)}・{SHOP_STATUS_ZH[status]}・
            {PAY_ZH[o.payment] ?? o.payment}
          </p>
        </div>
        <div className="p-actions">
          {/* 純 HTML 表單：老闆多半在手機上按，不需要等 JS */}
          {SHOP_STATUSES.filter((s) => s !== status).map((s) => (
            <form key={s} method="post" action="/api/portal/order-status">
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className={s === "cancelled" ? "p-btn p-btn-ghost" : "p-btn"}
              >
                標為{SHOP_STATUS_ZH[s]}
              </button>
            </form>
          ))}
        </div>
      </div>

      {!o.notified && (
        <div className="p-error">
          這筆的通知信沒有成功寄出（訂單資料本身完整無誤）。若經常發生，請告知 Avalo 檢查信箱設定。
        </div>
      )}

      {NEEDS_REPORT(o.payment) && (
        <div className={o.remitAt ? "p-msg" : "p-warn"}>
          {o.remitAt ? (
            <>
              客人已於 {fmt(o.remitAt)} 回報付款：末五碼 <b>{o.remitLast5}</b>
              {o.remitName ? `，付款人 ${o.remitName}` : ""}。核對入帳後請標為「已確認」。
            </>
          ) : (
            <>
              這是{PAY_ZH[o.payment]}訂單，客人尚未回報末五碼。收到款項前請先不要出貨。
            </>
          )}
        </div>
      )}

      <div className="p-tablewrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>品項</th>
              <th>單價</th>
              <th>數量</th>
              <th>小計</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.name ?? "—"}</td>
                <td className="p-nowrap">{typeof it.unitPrice === "number" ? twd(it.unitPrice) : "—"}</td>
                <td>{it.qty ?? 0} 包</td>
                <td className="p-nowrap">{typeof it.amount === "number" ? twd(it.amount) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bundles.length > 0 && (
        <div className="p-msg">
          <b>三包優惠</b>
          <br />
          {bundles.map((b, i) => (
            <span key={i}>
              {b.name}　{b.label}
              {typeof b.bundlePrice === "number" ? ` ${twd(b.bundlePrice)}` : ""}
              {b.sets && b.sets > 1 ? ` × ${b.sets} 組` : ""}
              　折抵 −{typeof b.saved === "number" ? twd(b.saved) : "—"}
              <br />
            </span>
          ))}
        </div>
      )}

      <div className="p-detail">
        <dl style={{ margin: 0 }}>
          <Field label="品項小計" value={twd(o.subtotal)} />
          <Field label="運費" value={o.shippingFee === 0 ? "免運" : twd(o.shippingFee)} />
          {o.codFee > 0 && <Field label="貨到付款手續費" value={twd(o.codFee)} />}
          <Field label="應收總額" value={<b>{twd(o.total)}</b>} />
          <Field label="訂購人" value={o.name} />
          <Field label="電話" value={<a href={`tel:${o.phone}`}>{o.phone}</a>} />
          <Field label="Email" value={o.email ? <a href={`mailto:${o.email}`}>{o.email}</a> : null} />
          <Field label="宅配地址" value={o.address} />
          <Field label="備註" value={o.note ? <span style={{ whiteSpace: "pre-wrap" }}>{o.note}</span> : null} />
        </dl>
      </div>
    </main>
  );
}
