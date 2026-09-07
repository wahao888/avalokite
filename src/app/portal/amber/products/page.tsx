import { notFound } from "next/navigation";
import { getHostTenant, getTenantSession } from "@/lib/tenant-auth";
import { listProducts, countProducts, PAGE_SIZE } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { CATEGORIES, categoryName } from "@/app/sites/amber/_data/categories";
import { priceLabel } from "@/app/sites/amber/_data/cart";
import { storage, thumbKey } from "@/lib/storage";
import LoginForm from "../../LoginForm";

export const dynamic = "force-dynamic";

// 跨檔期的商品總表。日常上架走檔期頁就夠了，這一頁是用來找舊商品的
// ——「上個月那件冰絲襪叫什麼名字」，然後按「再上一件」重新上架。

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const hostTenant = await getHostTenant();
  if (!hostTenant) notFound();
  if (!hostTenant.daigou) notFound();

  const tenant = await getTenantSession();
  if (!tenant) return <LoginForm tenantName={hostTenant.name} error={sp.error} />;

  const page = Math.max(1, Number(sp.page) || 1);
  const categoryKey = sp.cat || undefined;

  const [rows, total] = await Promise.all([
    listProducts(tenant.slug, {
      categoryKey,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      // 包含軟刪除的：這一頁的用途就是翻舊商品出來重上
      includeArchived: true,
    }),
    countProducts(tenant.slug),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `/portal/amber/products?page=${p}${categoryKey ? `&cat=${categoryKey}` : ""}`;

  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">所有商品</h1>
          <p className="p-sub">含已刪除的——舊商品可以按「再上一件」直接重新上架。</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber">
            連線管理
          </a>
        </div>
      </div>

      <div className="p-filters">
        <a href="/portal/amber/products" className={categoryKey ? "" : "on"}>
          全部
        </a>
        {CATEGORIES.map((c) => (
          <a
            key={c.key}
            href={`/portal/amber/products?cat=${c.key}`}
            className={categoryKey === c.key ? "on" : ""}
          >
            {c.name}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="p-empty">沒有符合的商品。</p>
      ) : (
        <div className="p-tablewrap">
          <table className="p-table">
            <thead>
              <tr>
                <th></th>
                <th>商品</th>
                <th>售價</th>
                <th>收單</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.deletedAt ? "done" : ""}>
                  <td>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={storage.url(thumbKey(p.images[0].key))}
                        alt=""
                        width={44}
                        height={44}
                        style={{ objectFit: "cover", borderRadius: 2, display: "block" }}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </td>
                  <td>
                    <a href={`/portal/amber/products/${encodeURIComponent(p.id)}`}>{p.name}</a>
                    <br />
                    <small>
                      {categoryName(p.categoryKey)}
                      {p.deletedAt ? "・已刪除" : ""}
                    </small>
                  </td>
                  <td className="p-nowrap">{priceLabel(p.price, p.options.map((o) => o.price))}</td>
                  <td className="p-nowrap">
                    {p.deadlineAt ? formatTaipei(p.deadlineAt) : "不截止"}
                  </td>
                  <td className="p-nowrap">
                    <a
                      className="p-btn-link"
                      href={`/portal/amber/products/new?batch=${encodeURIComponent(p.batchId)}&from=${encodeURIComponent(p.id)}`}
                    >
                      再上一件
                    </a>
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
