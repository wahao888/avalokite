import Link from "next/link";
import { listBeans, usedCountries, usedFamilies, usedProcesses, priceRange, type ProcessKey } from "./_data/beans";
import type { FamilyKey } from "./_data/flavor-wheel";
import { twd } from "./_data/shop";
import { BUNDLE_NOTE, LIST_NOTE, RK, SITE } from "./_data/site";
import BeanCard from "./_components/BeanCard";
import FlavorWheel from "./_components/FlavorWheel";
import OriginMap from "./_components/OriginMap";
import ProcessDiagram from "./_components/ProcessDiagram";
import Reveal from "./_components/Reveal";
import RoastCurve from "./_components/RoastCurve";
import LineButton from "./_components/LineButton";
import { getStock, visibleBeans } from "./_data/stock";

/** 背景那幾條等高線畫的是「雨來則漲、雨停則乾」的那條溪——品牌名的由來 */
function Creek() {
  return (
    <div className="rk-hero__creek" aria-hidden="true">
      <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            d={`M-40 ${170 + i * 46} C 220 ${110 + i * 50} 420 ${300 + i * 40} 700 ${230 + i * 46} S 1080 ${120 + i * 52} 1260 ${200 + i * 44}`}
            fill="none"
            stroke="var(--rk-line)"
            strokeWidth={i === 3 ? 1.4 : 0.8}
            opacity={i === 3 ? 0.9 : 0.45}
          />
        ))}
      </svg>
    </div>
  );
}

const arrow = (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
    <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const dynamic = "force-dynamic";

export default async function RekatHome() {
  const stock = await getStock();
  const beans = visibleBeans(stock);
  const bundled = beans.filter((b) => b.bundle).length;
  const [lo, hi] = priceRange();
  const countries = usedCountries();

  const famCounts = Object.fromEntries(usedFamilies().map((f) => [f.key, f.count])) as Partial<
    Record<FamilyKey, number>
  >;
  const processes = usedProcesses();
  const procCounts = Object.fromEntries(
    processes.map((p) => [p.key, beans.filter((b) => b.process === p.key).length]),
  ) as Partial<Record<ProcessKey, number>>;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="rk-hero">
        <Creek />
        <div className="rk-wrap rk-hero__in">
          <div>
            <Reveal>
              <span className="rk-eyebrow">Taitung, Taiwan・Since {SITE.roaster.settledYear}</span>
              <h1 className="rk-hero__word" style={{ marginTop: 18 }}>
                <span>Rekat</span>
                <span>Roastery</span>
              </h1>
              <p className="rk-hero__zh">
                三十年烘豆。
                <br />
                只停在一爆之後、二爆之前。
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="rk-hero__meta">
                <span className="rk-tag">{SITE.nameZh}</span>
                <span className="rk-tag">淺焙 / 淺中焙</span>
                <span className="rk-tag">半磅 227g</span>
              </div>

              <div className="rk-hero__cta">
                <Link className="rk-btn rk-btn--solid" href={`${RK}/beans`}>
                  看本期豆單
                </Link>
                <Link className="rk-btn rk-btn--ghost" href={`${RK}/craft`}>
                  風味輪與處理法
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <RoastCurve />
          </Reveal>
        </div>

        <div className="rk-wrap">
          <Reveal className="rk-facts" delay={260}>
            <div>
              <b>
                30<sup>年</sup>
              </b>
              <span>烘豆資歷</span>
            </div>
            <div>
              <b>{beans.length}</b>
              <span>本期品項</span>
            </div>
            <div>
              <b>{countries.length}</b>
              <span>產地國</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 本期重點 ─────────────────────────────────────────── */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 34 }}>
            <span className="rk-eyebrow">This Season・{SITE.listVersion}</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              本期全部 {beans.length} 支
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              從 {twd(lo)} 到 {twd(hi)}，{processes.length} 種處理法、{countries.length} 個產地。
              全部單一產區、下單後才烘，半磅裝原豆出貨。其中 {bundled} 支有三包優惠。
            </p>
          </Reveal>
        </div>

        {/* 首頁直接把整份豆單攤開。
            客戶的豆單本來就是一張紙、十五行——讓人一次看完，比先挑三支再要他點進去更接近原本的體驗。
            篩選與排序留在 /beans，這裡只負責「全部在這」。
            用 --wide 而不是一般的 rk-wrap：格線要比內文寬，但仍然留邊，不貼著視窗。 */}
        <div className="rk-wrap--wide">
          <Reveal className="rk-grid" delay={80}>
            {beans.map((b) => (
              <BeanCard key={b.slug} bean={b} soldOut={stock.soldOut.has(b.slug)} />
            ))}
          </Reveal>
        </div>

        <div className="rk-wrap" style={{ marginTop: 30 }}>
          <Link className="rk-arrow" href={`${RK}/beans`} style={{ color: "var(--rk-accent)" }}>
            用風味、處理法、產地篩選
            {arrow}
          </Link>
        </div>
      </section>

      {/* ── 風味輪 ───────────────────────────────────────────── */}
      <section className="rk-section rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 40, maxWidth: 640 }}>
            <span className="rk-eyebrow">Coffee Taster&apos;s Flavor Wheel</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              「果香」是一個方向，不是一個答案
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              杯測師描述一支豆子的方式，是從九個大方向出發，一層一層往外收斂到具體的詞。
              這張輪子就是那套語言的地圖——認得它，你看豆單的方式會不一樣。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <FlavorWheel counts={famCounts} />
          </Reveal>

          <p className="rk-caveat" style={{ marginTop: 28, maxWidth: 620 }}>
            結構依 SCA（Specialty Coffee Association）與 World Coffee Research
            2016 年共同修訂的咖啡風味輪整理，配色與中文為本站重製。
          </p>
        </div>
      </section>

      {/* ── 處理法 ───────────────────────────────────────────── */}
      <section className="rk-section">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 40, maxWidth: 640 }}>
            <span className="rk-eyebrow">Processing</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              乾燥之前留下哪幾層，決定了杯子裡有什麼
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              同一顆咖啡果實，果肉洗掉還是留著、有沒有先進密閉槽發酵過，
              喝起來會是兩件完全不同的事。切換看看。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <ProcessDiagram counts={procCounts} />
          </Reveal>
        </div>
      </section>

      {/* ── 產地 ─────────────────────────────────────────────── */}
      <section className="rk-section rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 36, maxWidth: 640 }}>
            <span className="rk-eyebrow">Origins</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              六個產地，都在同一條帶子上
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              咖啡樹只長在南北回歸線之間。海拔、日夜溫差、火山灰或紅土，
              決定了它在杯子裡會偏花、偏果，還是偏堅果。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <OriginMap />
          </Reveal>
        </div>
      </section>

      {/* ── 烘豆師 ───────────────────────────────────────────── */}
      <section className="rk-section rk-section--ink">
        <div className="rk-wrap rk-split rk-split--side">
          <Reveal>
            <span className="rk-eyebrow">The Roaster</span>
            <blockquote className="rk-quote" style={{ marginTop: 18 }}>
              {SITE.tagline}
              <cite>王龍・烘豆師</cite>
            </blockquote>
          </Reveal>

          <Reveal delay={100} className="rk-body">
            <p style={{ fontSize: 17, lineHeight: 2 }}>
              {SITE.nameOrigin}
            </p>
            <p style={{ fontSize: 17, lineHeight: 2 }}>
              {SITE.roaster.settledYear} 年夏天，王龍搬進這個部落，開始無農藥、無肥料的自然農耕，
              也把三十年的烘豆帶了進來。這份豆單上的生豆來自六個國家，
              但烘它們的是同一雙手、同一台機器、同一套判斷。
            </p>
            <p style={{ fontSize: 17, lineHeight: 2 }}>
              判斷只有一條：這支豆子的產地風味在哪裡，就停在哪裡。
              所以整份豆單沒有中深焙，也沒有調和配方。
            </p>
            <Link
              className="rk-arrow"
              href={`${RK}/about`}
              style={{ marginTop: 26 }}
            >
              關於日卡地
              {arrow}
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 收尾 ─────────────────────────────────────────────── */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap rk-wrap--narrow" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="rk-eyebrow">Order</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              訂單確認後才烘焙
            </h2>
            <p className="rk-lede" style={{ marginTop: 14, marginInline: "auto" }}>
              全品項半磅裝、一律出原豆，不代客研磨。本期 {bundled} 支有三包優惠。
              付款方式為銀行匯款 / ATM 轉帳與貨到付款，約 2–3 個工作天出貨。
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
              <Link className="rk-btn rk-btn--solid" href={`${RK}/beans`}>
                開始選豆
              </Link>
              <LineButton className="rk-btn rk-btn--quiet" />
              <a className="rk-btn rk-btn--quiet" href={`tel:${SITE.phoneTel}`}>
                來電 {SITE.phoneDisplay}
              </a>
            </div>
            <p className="rk-caveat" style={{ marginTop: 30, textAlign: "left" }}>
              {BUNDLE_NOTE}
              <br />
              {LIST_NOTE}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
