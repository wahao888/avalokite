import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBatch, currentBatch, getProduct, recentSpecAxes } from "@/lib/daigou-data";
import { QuickListForm } from "../../../_components/QuickListForm";
import LoginForm from "../../../LoginForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; from?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  // 指定了檔期就用它，沒指定就用目前進行中的那一檔。
  const batch = sp.batch
    ? await getBatch(tenant.slug, sp.batch)
    : await currentBatch(tenant.slug);

  // 沒有進行中的檔期時，直接把她導去建一檔——
  // 而不是給一張 batchId 為空、按下去才失敗的表單。
  if (!batch) {
    return (
      <main className="p-wrap">
        <h1 className="p-title">還沒有進行中的連線</h1>
        <p className="p-sub">商品要掛在檔期底下，才知道什麼時候收單、運費怎麼算。</p>
        <div className="p-dg-sticky" style={{ position: "static" }}>
          <a className="p-btn" href="/portal/amber">
            先開一檔連線
          </a>
        </div>
      </main>
    );
  }

  // 「再上一件」：帶入除了照片與名稱以外的一切。
  // getProduct 刻意也讀得到軟刪除的商品——上個月的目錄正是要重用的。
  const from = sp.from ? await getProduct(tenant.slug, sp.from) : null;
  const recentAxes = await recentSpecAxes(tenant.slug);

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">上架商品</h1>
          <p className="p-sub">
            {batch.title}
            {from ? `・沿用「${from.name}」的設定` : ""}
          </p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href={`/portal/amber/batches/${encodeURIComponent(batch.id)}`}>
            檔期
          </a>
        </div>
      </div>

      <QuickListForm
        batch={{
          id: batch.id,
          title: batch.title,
          defaultDeadlineISO: batch.defaultDeadlineAt?.toISOString() ?? null,
        }}
        recentAxes={recentAxes}
        prefill={
          from
            ? {
                // 名稱刻意不帶——她要上的是不同的商品，帶了反而要先清掉
                price: from.price,
                categoryKey: from.categoryKey,
                optionAxis: from.optionAxis,
                optionLabels: from.options.map((o) => o.label),
                preorder: from.preorder,
                showStock: from.showStock,
              }
            : undefined
        }
      />
    </main>
  );
}
