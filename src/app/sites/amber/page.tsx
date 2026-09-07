import { openBatches, listProducts } from "@/lib/daigou-data";
import { CATEGORIES } from "./_data/categories";
import { TENANT_SLUG, SITE } from "./_data/site";
import { batchTone } from "./_data/batch-tone";
import { DeadlineBar } from "./_components/DeadlineBar";
import { ProductCard, type CardProduct } from "./_components/ProductCard";

// 首頁 = 進行中檔期的商品。
//
// 刻意不是品牌介紹頁：她的客人是從 LINE 群組點連結進來的，
// 目的很明確就是看這一檔有什麼。多一層「進入商城」只是多一次點擊。
//
// ⚠ 支援**多檔同時進行**（韓國／日本／歐洲）。一檔連線就是一趟，
// 各自有自己的收單時間、預計到貨日與運費，所以：
//   ・上方列出所有進行中的檔期，可以切換或看全部
//   ・每張商品卡標示屬於哪一檔（用該檔的色）
//   ・購物車依檔期分組、分開結帳（那本來就是兩個包裹、兩筆運費）
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; c?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();

  const batches = await openBatches(TENANT_SLUG);

  if (batches.length === 0) {
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

  const active = sp.b ? batches.find((b) => b.id === sp.b) : null;
  const shown = active ? [active] : batches;

  const groups = await Promise.all(
    shown.map(async (b) => ({
      batch: b,
      products: await listProducts(TENANT_SLUG, {
        batchId: b.id,
        status: "live",
        categoryKey: sp.c || undefined,
        take: 200,
      }),
    })),
  );

  const allProducts = groups.flatMap((g) => g.products);
  const usedCategories = new Set(allProducts.map((p) => p.categoryKey).filter(Boolean));

  const toCard = (p: (typeof allProducts)[number], b: (typeof batches)[number]): CardProduct => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    status: p.status,
    deadlineAt: p.deadlineAt,
    preorder: p.preorder,
    options: p.options.map((o) => ({ price: o.price })),
    images: p.images.map((i) => ({ key: i.key })),
    batch: { defaultDeadlineAt: b.defaultDeadlineAt, status: b.status },
    // 多檔同開時，卡片要看得出這件屬於哪一趟
    batchTitle: batches.length > 1 ? b.title : null,
    batchTone: batchTone(b.id, b.tone),
  });

  const qs = (patch: { b?: string | null; c?: string | null }) => {
    const b = patch.b === undefined ? sp.b : patch.b;
    const c = patch.c === undefined ? sp.c : patch.c;
    const parts = [b ? `b=${encodeURIComponent(b)}` : "", c ? `c=${encodeURIComponent(c)}` : ""];
    const q = parts.filter(Boolean).join("&");
    return q ? `/?${q}` : "/";
  };

  return (
    <div className="am-wrap">
      {/* 多檔同開時先讓客人選這一趟；只有一檔就不必多一排東西 */}
      {batches.length > 1 && (
        <nav className="am-cats" aria-label="連線檔期">
          <a href={qs({ b: null })} className={!sp.b ? "on" : ""}>
            全部連線
          </a>
          {batches.map((b) => {
            const tone = batchTone(b.id, b.tone);
            return (
              <a
                key={b.id}
                href={qs({ b: b.id })}
                className={sp.b === b.id ? "on" : ""}
                style={sp.b === b.id ? { background: tone.ink, borderColor: tone.ink } : { borderColor: tone.line }}
              >
                {b.title}
              </a>
            );
          })}
        </nav>
      )}

      {usedCategories.size > 0 && (
        <nav className="am-cats" aria-label="商品分類">
          <a href={qs({ c: null })} className={!sp.c ? "on" : ""}>
            全部
          </a>
          {CATEGORIES.filter((c) => usedCategories.has(c.key)).map((c) => (
            <a key={c.key} href={qs({ c: c.key })} className={sp.c === c.key ? "on" : ""}>
              {c.name}
            </a>
          ))}
        </nav>
      )}

      {groups.map(({ batch, products }) => (
        <section key={batch.id} className="am-batch">
          <DeadlineBar
            title={batch.title}
            deadline={batch.defaultDeadlineAt}
            now={now}
            closed={batch.status !== "open"}
            closedLabel="本檔已收單"
            tone={batchTone(batch.id, batch.tone)}
          />

          {products.length === 0 ? (
            <p className="am-empty">
              {sp.c ? "這一檔沒有這個分類的商品。" : "這一檔還在準備中，商品馬上就會上架 🙌"}
            </p>
          ) : (
            <div className="am-grid">
              {products.map((p) => (
                <ProductCard key={p.id} p={toCard(p, batch)} now={now} />
              ))}
            </div>
          )}
        </section>
      ))}

      {batches.length > 1 && (
        <p className="am-field__hint" style={{ marginTop: "1.5rem" }}>
          不同連線是分開出貨的（不同國家、不同時間到台灣），
          所以運費會各收一次，結帳時也要分開結。
        </p>
      )}
    </div>
  );
}
