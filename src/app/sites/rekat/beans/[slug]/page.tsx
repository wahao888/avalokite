import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import {
  beanSlugs,
  getBean,
  listBeans,
  PROCESS,
  PROFILE_LABEL,
  ROAST,
  UNIT_GRAMS,
  UNIT_LABEL,
  type Profile,
} from "../../_data/beans";
import { FAMILY } from "../../_data/flavor-wheel";
import { BREW_METHODS } from "../../_data/knowledge";
import { twd } from "../../_data/shop";
import { RK, SITE } from "../../_data/site";
import AddToCart from "../../_components/AddToCart";
import BeanArt from "../../_components/BeanArt";
import BeanCard from "../../_components/BeanCard";
import FlavorRadar from "../../_components/FlavorRadar";
import Reveal from "../../_components/Reveal";
import RoastBar from "../../_components/RoastBar";
import { getStock } from "../../_data/stock";

const ORIGIN = tenantOrigin(getTenant("rekat")!);

// 供應狀態住在資料庫，所以不能預先產生（見 _data/stock.ts 的說明）。
// 豆單本身仍在程式碼裡，這裡每次請求只多讀一列 SQLite。
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = getBean(slug);
  if (!b) return { title: "找不到這支豆子" };

  const desc = `${b.nameZh}｜${PROCESS[b.process].labelZh}・${ROAST[b.roast].labelZh}。風味：${b.notes.join("、")}。半磅 227g ${twd(b.price)}，原豆出貨。REKAT ROASTERY 台東鹿野自家烘焙。`;

  return {
    title: `${b.nameZh}`,
    description: desc,
    alternates: { canonical: `/beans/${b.slug}` },
    openGraph: {
      title: `${b.nameZh}｜REKAT ROASTERY`,
      description: b.excerpt,
      type: "article",
    },
  };
}

const arrow = (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
    <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export default async function BeanDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bean = getBean(slug);
  if (!bean) notFound();

  // 店家下架的豆子等同不存在，不透露它曾經在
  const stock = await getStock();
  if (stock.hidden.has(bean.slug)) notFound();
  const soldOut = stock.soldOut.has(bean.slug);

  const fam = FAMILY[bean.families[0]!];
  const proc = PROCESS[bean.process];
  const roast = ROAST[bean.roast];
  const brew = BREW_METHODS.filter((m) => m.key === "v60" || m.key === "clever" || m.key === "french");
  const others = listBeans()
    .filter((b) => b.slug !== bean.slug && b.families.some((f) => bean.families.includes(f)))
    .slice(0, 3);

  // Product + Offer：讓搜尋結果直接顯示價格與供應狀態。
  // 價格與幣別是事實（豆單上的數字），不宣告評分或評論。
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${bean.nameZh}（${UNIT_LABEL}）`,
    alternateName: bean.nameEn,
    description: bean.excerpt,
    category: "Coffee Beans",
    brand: { "@type": "Brand", name: SITE.name },
    countryOfOrigin: bean.country,
    weight: { "@type": "QuantitativeValue", value: UNIT_GRAMS, unitCode: "GRM" },
    offers: {
      "@type": "Offer",
      url: `${ORIGIN}/beans/${bean.slug}`,
      priceCurrency: "TWD",
      price: bean.price,
      availability: soldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="rk-wrap">
        <nav aria-label="麵包屑" style={{ paddingTop: 26 }}>
          <Link className="rk-arrow rk-mute" href={`${RK}/beans`}>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true" style={{ transform: "rotate(180deg)" }}>
              <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            本期豆單
          </Link>
        </nav>

        <article className="rk-bean">
          {/* ── 左：插畫與風味輪廓 ── */}
          <div>
            <div className="rk-bean__art">
              <BeanArt bean={bean} />
              <div style={{ width: "100%", borderTop: "1px solid var(--rk-line)", paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <span className="rk-eyebrow">Flavor Profile</span>
                  <span className="rk-eyebrow">1 – 5</span>
                </div>
                <FlavorRadar bean={bean} />
                <p className="rk-caveat" style={{ marginTop: 4 }}>
                  風味輪廓由豆單的風味描述繪製，屬示意圖，非 SCA 杯測分數。
                  正式杯測表待烘豆師提供後更新。
                </p>
              </div>
            </div>
          </div>

          {/* ── 右：品名、規格、購買 ── */}
          <div>
            <span className="rk-eyebrow">
              NO.{String(bean.no).padStart(2, "0")}・{bean.country}
              {bean.region ? `・${bean.region}` : ""}
            </span>
            <h1 className="rk-h1 rk-bean__title" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
              {bean.nameZh}
            </h1>
            <p className="rk-card__en" style={{ fontSize: 12, marginTop: 8 }}>
              {bean.nameEn}
            </p>

            <p className="rk-lede" style={{ marginTop: 22, fontSize: 17 }}>
              {bean.excerpt}
            </p>

            <div className="rk-card__notes" style={{ marginTop: 20 }}>
              {bean.families.map((f) => (
                <span key={f} className="rk-tag rk-tag--dot" style={{ ["--dot" as string]: FAMILY[f].color }}>
                  {FAMILY[f].zh}
                </span>
              ))}
              {bean.bundle && (
                <span className="rk-tag rk-tag--ember">
                  {bean.bundle.label} {twd(bean.bundle.price)}
                </span>
              )}
              {bean.airFreight && <span className="rk-tag">空運批次</span>}
            </div>

            {/* 規格表 */}
            <dl className="rk-spec">
              <div>
                <dt>風味</dt>
                <dd>{bean.notes.join("・")}</dd>
              </div>
              <div>
                <dt>處理法</dt>
                <dd>
                  {proc.labelZh}　<small>{proc.labelEn}</small>
                  <br />
                  <small>{proc.gist}</small>
                </dd>
              </div>
              <div>
                <dt>烘焙度</dt>
                <dd>
                  {roast.labelZh}　<small>{roast.labelEn}</small>
                  <RoastBar roast={bean.roast} />
                </dd>
              </div>
              <div>
                <dt>產地</dt>
                <dd>
                  {bean.country}
                  {bean.region ? `・${bean.region}` : ""}
                </dd>
              </div>
              <div>
                <dt>品種</dt>
                <dd>{bean.variety ?? <small>批次資料待烘豆師提供</small>}</dd>
              </div>
              <div>
                <dt>規格</dt>
                <dd>{UNIT_LABEL}</dd>
              </div>
              {bean.bundle && (
                <div>
                  <dt>{bean.bundle.label}</dt>
                  <dd>
                    {twd(bean.bundle.price)}
                    <small>
                      　{bean.bundle.qty} 包一組，原價 {twd(bean.price * bean.bundle.qty)}，
                      省 {twd(bean.price * bean.bundle.qty - bean.bundle.price)}
                    </small>
                  </dd>
                </div>
              )}
            </dl>

            {soldOut ? (
              <div className="rk-buy">
                <p className="rk-h3" style={{ marginBottom: 8 }}>本期售完</p>
                <p className="rk-buy__note">
                  這一支這批已經賣完了。補到貨會在豆單上恢復販售，
                  想先預留可以來電 {SITE.phoneDisplay}。
                </p>
                <Link className="rk-btn rk-btn--quiet" href={`${RK}/beans`} style={{ marginTop: 16 }}>
                  看其他豆子
                </Link>
              </div>
            ) : (
              <AddToCart bean={bean} />
            )}
          </div>
        </article>
      </div>

      {/* ── 這支豆子的故事 ── */}
      <section className="rk-section rk-section--tight rk-section--alt">
        <div className="rk-wrap rk-split">
          <Reveal>
            <span className="rk-eyebrow">Notes</span>
            <h2 className="rk-h2" style={{ marginTop: 10, fontSize: "clamp(22px, 3vw, 30px)" }}>
              關於這一支
            </h2>
          </Reveal>
          <Reveal delay={80} className="rk-body">
            {bean.story.map((p, i) => (
              <p key={i} style={{ fontSize: 15.5, lineHeight: 2 }}>
                {p}
              </p>
            ))}
            {bean.context && (
              <p className="rk-caveat" style={{ marginTop: 24 }}>
                <b style={{ display: "block", marginBottom: 4, color: "var(--rk-ink-2)" }}>產區背景</b>
                {bean.context}
                <br />
                （公開資料整理，非本批次的批次卡。）
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── 沖煮建議 ── */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">Brewing</span>
            <h2 className="rk-h2" style={{ marginTop: 10, fontSize: "clamp(22px, 3vw, 30px)" }}>
              這支怎麼沖
            </h2>
          </Reveal>

          <Reveal delay={60} className="rk-tablewrap">
            <table className="rk-table">
              <thead>
                <tr>
                  <th>方式</th>
                  <th>研磨</th>
                  <th>粉水比</th>
                  <th>水溫</th>
                  <th>時間</th>
                </tr>
              </thead>
              <tbody>
                {brew.map((m) => {
                  const [lo, hi] = m.temp[bean.roast];
                  return (
                    <tr key={m.key}>
                      <td>
                        <b>{m.name}</b>
                      </td>
                      <td>{m.grind}</td>
                      <td className="rk-num">{m.ratio}</td>
                      <td className="rk-num">
                        {lo}–{hi}°C
                      </td>
                      <td className="rk-num">{m.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Reveal>

          <p style={{ marginTop: 18 }}>
            <Link className="rk-arrow" href={`${RK}/brewing`} style={{ color: "var(--rk-accent)" }}>
              完整沖煮與保存指南
              {arrow}
            </Link>
          </p>
        </div>
      </section>

      {/* ── 同調性的其他豆子 ── */}
      {others.length > 0 && (
        <section className="rk-section rk-section--tight" style={{ paddingTop: 0 }}>
          <div className="rk-wrap" style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">More like this</span>
            <h2 className="rk-h2" style={{ marginTop: 10, fontSize: "clamp(22px, 3vw, 30px)" }}>
              同樣走{fam.zh}的還有
            </h2>
          </div>
          <div className="rk-grid">
            {others.map((b) => (
              <BeanCard key={b.slug} bean={b} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
