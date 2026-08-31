import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ScoopArt from "../../_components/ScoopArt";
import Morph from "../../_components/Morph";
import FlavorCard from "../../_components/FlavorCard";
import Reveal from "../../_components/Reveal";
import { getTodayBoard } from "../../_data/board";
import { ALLERGEN_ZH, flagsOf, getFlavor, listFlavors } from "../../_data/flavors";
import { ML, SITE } from "../../_data/site";

// 今日供應板住在資料庫，而部署是「在本機 build 再把產物送上去」——
// 預先產生的話，HTML 裡包的會是開發機 dev.db 的看板，rsync 上去就成了初始快取，
// 店家改過的口味會在部署後短暫倒退回開發者電腦裡的那份（2026-08-31 實際踩到）。
// 這頁的重點就是「今天賣什麼」，寧可每次讀一下 SQLite 也不能給過期資料。
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFlavor(slug);
  if (!f) return { title: "找不到這個口味" };

  return {
    title: `${f.nameZh} ${f.nameEn}`,
    description: `${f.excerpt} Monsieur Long 隆先生的手工 Gelato，大稻埕貴德街。風味：${f.notes.join("、")}。`,
    alternates: { canonical: `/flavors/${f.slug}` },
    openGraph: {
      title: `${f.nameZh}｜Monsieur Long 隆先生`,
      description: f.excerpt,
      type: "article",
    },
  };
}

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [flavor, all, board] = await Promise.all([getFlavor(slug), listFlavors(), getTodayBoard()]);
  if (!flavor) notFound();

  const flags = flagsOf(flavor);
  const today = board.slugs.has(flavor.slug);
  const others = all.filter((f) => f.slug !== flavor.slug).slice(0, 4);

  // MenuItem：讓 Google 認得這是一個菜單品項，而不是一篇文章。
  // 成分與過敏原尚未經店家確認，所以不輸出 suitableForDiet／allergen 之類的欄位。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: `${flavor.nameZh} ${flavor.nameEn}`,
    description: flavor.excerpt,
    menuAddOn: undefined,
    offers: { "@type": "Offer", availability: today ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability" },
    isPartOf: { "@type": "Menu", name: "Gelato", provider: { "@type": "IceCreamShop", name: SITE.name } },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section
        className="ml-fhero"
        style={
          {
            ["--ml-accent" as string]: flavor.color,
            ["--ml-accent-deep" as string]: flavor.colorDeep,
          } as React.CSSProperties
        }
        data-scoop-color={flavor.color}
      >
        <div className="ml-wrap">
          <nav className="ml-crumb" aria-label="麵包屑">
            <Link href={`${ML}/flavors`}>← 所有口味</Link>
          </nav>

          <div className="ml-fhero-in">
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {today && <span className="ml-tag ml-tag--today">今日供應</span>}
                {flags.isNew && <span className="ml-tag ml-tag--new">New</span>}
                {flags.isLimited && (
                  <span className="ml-tag ml-tag--limited">
                    {flavor.badge ?? "期間限定"}
                    {flags.daysLeft !== null && flags.daysLeft <= 45 ? `・剩 ${flags.daysLeft} 天` : ""}
                  </span>
                )}
                {flags.isExpired && <span className="ml-tag ml-tag--off">這一季已結束</span>}
              </div>

              <h1 className="ml-fhero-title">{flavor.nameZh}</h1>
              <p className="ml-fhero-en ml-en">{flavor.nameEn}</p>

              <ul className="ml-notes">
                {flavor.notes.map((n) => (
                  <li className="ml-note-chip" key={n}>
                    {n}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ml-fhero-art">
              <Morph name={`scoop-${flavor.slug}`}>
                <ScoopArt flavor={flavor} title={`${flavor.nameZh} 冰淇淋插畫`} />
              </Morph>
            </div>
          </div>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight ml-sec--paper2">
        <div className="ml-wrap ml-split">
          <Reveal>
            <p className="ml-eyebrow">關於這一支</p>
            <div className="ml-prose" style={{ marginTop: 18 }}>
              {flavor.story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <dl className="ml-facts">
              <div className="ml-fact">
                <dt>風味</dt>
                <dd>{flavor.notes.join("・")}</dd>
              </div>
              <div className="ml-fact">
                <dt>分類</dt>
                <dd>{flavor.kind === "seasonal" ? "季節・期間限定" : "常駐招牌"}</dd>
              </div>
              {flavor.availableTo && (
                <div className="ml-fact">
                  <dt>供應到</dt>
                  <dd>
                    {flavor.availableTo}
                    {flags.daysLeft !== null ? `（剩 ${flags.daysLeft} 天）` : "（已結束）"}
                  </dd>
                </div>
              )}
              <div className="ml-fact">
                <dt>今日</dt>
                <dd>{today ? "櫃上有" : "以店內實際供應為準"}</dd>
              </div>
              <div className="ml-fact">
                <dt>成分</dt>
                <dd>
                  {flavor.allergens && flavor.allergens.length > 0
                    ? `含 ${flavor.allergens.map((a) => ALLERGEN_ZH[a]).join("、")}`
                    : "過敏原與成分請以店內標示為準，或直接詢問店員。"}
                </dd>
              </div>
            </dl>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <a
                className="ml-btn ml-btn--primary"
                href={SITE.directionsUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                前往店舖吃一支
              </a>
              <Link href={`${ML}/flavors`} className="ml-btn ml-btn--ghost">
                看其他口味
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="ml-sec ml-sec--tight">
        <div className="ml-wrap">
          <Reveal>
            <div className="ml-head">
              <p className="ml-eyebrow">還有這些</p>
              <h2 className="ml-h3">要不要順便看一下</h2>
            </div>
          </Reveal>
          <div className="ml-grid">
            {others.map((f) => (
              <FlavorCard key={f.slug} flavor={f} today={board.slugs.has(f.slug)} compact />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
