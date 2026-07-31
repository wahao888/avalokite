import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getInquiry } from "@/lib/tenant-data";
import LoginForm from "../LoginForm";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(d);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="p-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function InquiryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} />;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  // getInquiry 的 where 帶 tenantId：別家的單一律查不到，不透露是否存在
  const q = await getInquiry(tenant.slug, id);
  if (!q) notFound();

  return (
    <main className="p-wrap">
      <a className="p-back" href="/portal">← 回列表</a>
      <div className="p-head">
        <div>
          <h1 className="p-title">表單 #{q.id}</h1>
          <p className="p-sub">{fmt(q.createdAt)}・{q.handled ? "✓ 已處理" : "待處理"}</p>
        </div>
        <div className="p-actions">
          <form method="post" action="/api/portal/handle">
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="handled" value={q.handled ? "0" : "1"} />
            <button type="submit" className="p-btn">
              {q.handled ? "改回待處理" : "標記已處理"}
            </button>
          </form>
        </div>
      </div>

      {!q.notified && (
        <div className="p-error">
          這筆的通知信沒有成功寄出（資料本身完整無誤）。若經常發生，請告知 Avalo 檢查信箱設定。
        </div>
      )}

      <div className="p-detail">
        <dl style={{ margin: 0 }}>
          <Field label="姓名" value={q.name} />
          <Field
            label="電話"
            value={q.phone ? <a href={`tel:${q.phone}`}>{q.phone}</a> : null}
          />
          <Field
            label="Email"
            value={q.email ? <a href={`mailto:${q.email}`}>{q.email}</a> : null}
          />
          <Field label="場域／工程" value={q.company} />
          <Field label="表單" value={q.service} />
          <Field label="區域" value={q.budget} />
          <Field label="內容" value={q.message} />
          <Field label="處理時間" value={q.handledAt ? fmt(q.handledAt) : null} />
        </dl>
      </div>
    </main>
  );
}
