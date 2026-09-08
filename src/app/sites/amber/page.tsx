import { openBatches, listProducts } from "@/lib/daigou-data";
import { formatTaipei } from "@/lib/tw-time";
import { CATEGORIES } from "./_data/categories";
import { TENANT_SLUG, SITE } from "./_data/site";
import { batchTone } from "./_data/batch-tone";
import { DeadlineBar } from "./_components/DeadlineBar";
import { Countdown } from "./_components/Countdown";
import { ProductCard, type CardProduct } from "./_components/ProductCard";
import { HeroArt } from "./_components/HeroArt";
import { RotatingWord } from "./_components/RotatingWord";
import { Features, TrustChips, FlowSteps, HelpCta } from "./_components/Blocks";
import { AmberMark } from "./_components/Logo";
import {
  CategoryIcon,
  IconArrowRight,
  IconCalendar,
  IconChat,
  IconChevronRight,
  IconClock,
  IconSparkle,
  IconStore,
} from "./_components/Icons";

// 首頁。
//
// ⚠ 手機與桌機的任務不一樣，所以版面也不一樣：
//
//   手機  客人是從 LINE 群組點連結進來的，目的很明確就是看這一檔有什麼。
//         所以 hero **完全不出現**（CSS 直接 display:none），第一屏就是
//         收單時間與商品格。品牌的話留到商品看完之後再說。
//   桌機  有橫向空間，第一屏放得下 hero 而不擠掉商品。這裡才建立
//         「這是一間正經的店」的印象——那正是桌機訪客會判斷的事。
//
// ⚠ 支援**多檔同時進行**（韓國／日本／歐洲）。一檔連線就是一趟，
// 各自有自己的收單時間、預計到貨日與運費，所以：
//   ・上方列出所有進行中的檔期，可以切換或看全部
//   ・每張商品卡標示屬於哪一檔（用該檔的色）
//   ・購物車依檔期分組、分開結帳（那本來就是兩個包裹、兩筆運費）
export const dynamic = "force-dynamic";

/** hero 小標輪播的地區。跟 _data/nav.ts 的 FEATURES 描述的市場一致 */
const SHOPPING_IN = ["KOREA", "JAPAN", "EUROPE"] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; c?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();

  const batches = await openBatches(TENANT_SLUG);

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

  // hero 裡的「最近一次收單」。多檔同開時取最早截止的那一檔——
  // 那才是客人真正要趕的死線。
  const nextDeadline = batches
    .map((b) => b.defaultDeadlineAt)
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const toCard = (p: (typeof allProducts)[number], b: (typeof batches)[number]): CardProduct => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    status: p.status,
    categoryKey: p.categoryKey,
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
    <>
      {/* ── Hero：桌機限定 ──────────────────────────────
          手機上這一整段是 display:none。不是「縮小」而是「不存在」——
          在 375px 上，一個 400px 高的 hero 就是把「買」推到摺線下面。 */}
      <section className="am-hero">
        <div className="am-hero__inner">
          <div className="am-hero__text">
            <p className="am-eyebrow">
              <IconSparkle size={14} stroke={2} />
              Personal shopping in
              <RotatingWord words={SHOPPING_IN} />
            </p>

            {/* 一句標語就好。「怎麼算錢、怎麼出貨」那些話在
                /how 與商品頁講得更清楚，堆在 hero 只會沒有人讀。 */}
            <h1>
              你挑，<em>我們飛</em>
            </h1>
            <p className="am-hero__en">You pick. We fly.</p>

            <div className="am-btns">
              <a className="am-btn am-btn--accent" href="#products">
                看本檔商品
                <IconArrowRight size={17} stroke={2} />
              </a>
              <a className="am-btn am-btn--ghost" href="/how">
                購買流程
                <IconChevronRight size={16} stroke={2} />
              </a>
            </div>

            <div className="am-hero__meta">
              <span>
                <IconCalendar size={16} stroke={1.8} />
                {batches.length > 0 ? `${batches.length} 檔連線進行中` : "下一檔準備中"}
              </span>
              {nextDeadline && (
                <span>
                  <IconClock size={16} stroke={1.8} />
                  最近收單 {formatTaipei(nextDeadline)}
                  {/* 絕對時間由伺服器渲染（決定性、無 JS 也看得到），
                      掛載後才在旁邊補上會走的「剩 N 天」 */}
                  <Countdown
                    deadlineISO={nextDeadline.toISOString()}
                    serverNowISO={now.toISOString()}
                  />
                </span>
              )}
              <span>
                <IconStore size={16} stroke={1.8} />
                7-11 交貨便寄送
              </span>
            </div>
          </div>

          <HeroArt />
        </div>
      </section>

      <div className="am-wrap" id="products">
        {batches.length === 0 ? (
          <>
            <p className="am-empty">
              <AmberMark size={34} stroke={1.3} className="am-empty__i" />
              目前沒有進行中的連線。
              <br />
              下一檔開跑時會在 LINE 通知大家。
            </p>
            <div className="am-btns" style={{ justifyContent: "center", marginTop: "1rem" }}>
              {SITE.lineAddUrl && (
                <a className="am-btn am-btn--accent" href={SITE.lineAddUrl}>
                  <IconChat size={17} stroke={1.9} />
                  加 LINE 收開賣通知
                </a>
              )}
              <a className="am-btn am-btn--ghost" href="/lineups">
                看過往連線
                <IconChevronRight size={16} stroke={2} />
              </a>
            </div>
          </>
        ) : (
          <>
            {/* 多檔同開時先讓客人選這一趟；只有一檔就不必多一排東西 */}
            {batches.length > 1 && (
              <nav className="am-cats" aria-label="連線檔期">
                <a href={qs({ b: null })} className={!sp.b ? "on" : ""}>
                  <IconCalendar size={15} stroke={1.9} />
                  全部連線
                </a>
                {batches.map((b) => {
                  const tone = batchTone(b.id, b.tone);
                  return (
                    <a
                      key={b.id}
                      href={qs({ b: b.id })}
                      className={sp.b === b.id ? "on" : ""}
                      style={
                        sp.b === b.id
                          ? { background: tone.ink, borderColor: tone.ink }
                          : { borderColor: tone.line }
                      }
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
                    <CategoryIcon categoryKey={c.key} size={15} stroke={1.9} />
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
                    {sp.c
                      ? "這一檔沒有這個分類的商品。"
                      : "這一檔還在準備中，商品馬上就會上架。"}
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
          </>
        )}

        {/* 手機版的信任列。放在商品**下面**——上面的每一個像素都屬於商品 */}
        <div className="am-mobile-only" style={{ marginTop: "2rem" }}>
          <TrustChips />
        </div>
      </div>

      {/* 桌機才展開成四張卡。手機上這段訊息由上面那排晶片承擔 */}
      <div className="am-band am-desktop-only">
        <div className="am-band__inner">
          <div className="am-section__head">
            <h2>為什麼在 {SITE.name} 下單</h2>
            <p>代購最怕的三件事：買到假貨、價格不透明、東西不知道去哪了。</p>
          </div>
          <Features />
        </div>
      </div>

      <div className="am-wrap">
        <section className="am-section">
          <div className="am-section__head">
            <h2>怎麼買</h2>
            <p>從你說「我要這個」到收到包裹，一共六步。</p>
          </div>
          <FlowSteps variant="rail" />
          <div className="am-btns" style={{ marginTop: "1.2rem" }}>
            <a className="am-btn am-btn--ghost" href="/how">
              看完整的購買流程與運費說明
              <IconChevronRight size={16} stroke={2} />
            </a>
          </div>
        </section>

        <HelpCta />
      </div>
    </>
  );
}
