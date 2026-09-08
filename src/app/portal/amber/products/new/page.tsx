import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { getBatch, openBatches, getProduct, recentSpecAxes } from "@/lib/daigou-data";
import { BatchPicker } from "../../BatchPicker";
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

  // 指定了檔期就用它。沒指定時只有在「剛好只有一檔進行中」的情況下
  // 才自動帶入——同時開兩檔以上一律問她（見 BatchPicker 的註解：
  // 猜錯的成本是整批商品掛錯檔期，而且不會報錯）。
  const openList = sp.batch ? [] : await openBatches(tenant.slug);
  if (!sp.batch && openList.length > 1) {
    return (
      <BatchPicker
        title="這一件要上到哪一檔？"
        hint={`目前有 ${openList.length} 檔連線同時進行。選錯檔期會連收單時間、到貨日與運費一起錯。`}
        batches={openList}
        basePath="/portal/amber/products/new"
      />
    );
  }

  const batch = sp.batch ? await getBatch(tenant.slug, sp.batch) : (openList[0] ?? null);

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
