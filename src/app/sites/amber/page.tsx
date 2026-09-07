import { currentBatch, listProducts } from "@/lib/daigou-data";
import { CATEGORIES } from "./_data/categories";
import { TENANT_SLUG, SITE } from "./_data/site";
import { DeadlineBar } from "./_components/DeadlineBar";
import { ProductCard, type CardProduct } from "./_components/ProductCard";

// 首頁 = 進行中那一檔的商品列表。
//
// 刻意不是品牌介紹頁：她的客人是從 LINE 群組點連結進來的，
// 目的很明確就是看這一檔有什麼。多一層「進入商城」只是多一次點擊。
//
// force-dynamic：收單狀態是 (deadline, now) 算出來的，不能被預先產生。
// 快取的部分由 next.config.ts 的 host 規則整站 no-store 處理。
export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const batch = await currentBatch(TENANT_SLUG);

  if (!batch) {
    return (
      <div className="am-wrap">
        <h1 className="am-h1">{SITE.name}</h1>
        <p className="am-empty">
          目前沒有進行中的連線。
          <br />
          下一檔開跑時會在 LINE 通知大家 🙌
        </p>
      </div>
    );
  }

  const products = await listProducts(TENANT_SLUG, {
    batchId: batch.id,
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

  // 只列出這一檔真的有商品的分類——空分類點進去看到空白很掃興
  const used = new Set(products.map((p) => p.categoryKey).filter(Boolean));

  return (
    <div className="am-wrap">
      <DeadlineBar
        title={batch.title}
        deadline={batch.defaultDeadlineAt}
        now={now}
        closed={batch.status !== "open"}
        closedLabel="本檔已收單"
      />

      {used.size > 0 && (
        <nav className="am-cats" aria-label="商品分類">
          <a href="/" className="on">
            全部
          </a>
          {CATEGORIES.filter((c) => used.has(c.key)).map((c) => (
            <a key={c.key} href={`/c/${c.key}`}>
              {c.name}
            </a>
          ))}
        </nav>
      )}

      {cards.length === 0 ? (
        <p className="am-empty">這一檔還在準備中，商品馬上就會上架 🙌</p>
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
