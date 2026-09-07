import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { currentBatch, listProducts } from "@/lib/daigou-data";
import { CATEGORIES, getCategory } from "../../_data/categories";
import { TENANT_SLUG } from "../../_data/site";
import { DeadlineBar } from "../../_components/DeadlineBar";
import { ProductCard, type CardProduct } from "../../_components/ProductCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const c = getCategory(category);
  return { title: c ? c.name : "分類" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const now = new Date();
  const batch = await currentBatch(TENANT_SLUG);
  if (!batch) notFound();

  const products = await listProducts(TENANT_SLUG, {
    batchId: batch.id,
    categoryKey: cat.key,
    status: "live",
    take: 200,
  });

  const cards: CardProduct[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    status: p.status,
    deadlineAt: p.deadlineAt,
    preorder: p.preorder,
    options: p.options.map((o) => ({ price: o.price })),
    images: p.images.map((i) => ({ key: i.key })),
    batch: { defaultDeadlineAt: batch.defaultDeadlineAt, status: batch.status },
  }));

  return (
    <div className="am-wrap">
      <DeadlineBar
        title={batch.title}
        deadline={batch.defaultDeadlineAt}
        now={now}
        closed={batch.status !== "open"}
        closedLabel="本檔已收單"
      />

      <nav className="am-cats" aria-label="商品分類">
        <a href="/">全部</a>
        {CATEGORIES.map((c) => (
          <a key={c.key} href={`/c/${c.key}`} className={c.key === cat.key ? "on" : ""}>
            {c.name}
          </a>
        ))}
      </nav>

      <h1 className="am-h1">{cat.name}</h1>

      {cards.length === 0 ? (
        <p className="am-empty">這一檔的「{cat.name}」還沒有商品。</p>
      ) : (
        <div className="am-grid">
          {cards.map((p) => (
            <ProductCard key={p.id} p={p} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
