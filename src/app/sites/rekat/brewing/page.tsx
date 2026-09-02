import type { Metadata } from "next";
import Link from "next/link";
import { BREW_METHODS, FAQ, FRESHNESS } from "../_data/knowledge";
import { ROAST } from "../_data/beans";
import { RK, SITE } from "../_data/site";
import BrewArt, { FreshnessArt, type BrewKey, type FreshKey } from "../_components/BrewArt";
import BrewCalc from "../_components/BrewCalc";
import GrindScale from "../_components/GrindScale";
import Reveal from "../_components/Reveal";

export const metadata: Metadata = {
  title: "沖煮與保存指南",
  description:
    "手沖、聰明濾杯、愛樂壓、法壓、義式的粉水比與水溫建議；養豆期、賞味期、研磨與保存方式。附互動式粉水比計算機。",
  alternates: { canonical: "/brewing" },
};

// 常見問題輸出 FAQPage 結構化資料——這幾題正是搜尋「淺焙會不會很酸」會問的。
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/** FRESHNESS 四段的配圖，順序同 _data/knowledge.ts 的陣列 */
const FRESH_ART: FreshKey[] = ["degas", "window", "grind", "store"];

export default function BrewingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <section className="rk-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 76px) clamp(28px, 4vw, 48px)" }}>
        <Reveal className="rk-wrap--narrow" style={{ padding: 0 }}>
          <span className="rk-eyebrow">Brewing & Storage</span>
          <h1 className="rk-h1" style={{ marginTop: 12 }}>
            沖煮與保存
          </h1>
          <p className="rk-lede" style={{ marginTop: 20 }}>
            一支豆子從我們手上出去，還有一半的路要在你的廚房走完。
            這頁是那一半的地圖：先給一個能照著做的起點，再說明為什麼是這個起點。
          </p>
        </Reveal>
      </section>

      <hr className="rk-rule" />

      {/* 器具 */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">Equipment</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              五種沖法，五種杯子
            </h2>
            <p className="rk-lede" style={{ marginTop: 12 }}>
              同一支豆子，用不同的方式沖，出來會是不同的東西——差別在水跟粉接觸多久、
              有沒有壓力、濾材留不留油脂。
            </p>
          </Reveal>

          <Reveal delay={60} className="rk-brews">
            {BREW_METHODS.map((m) => (
              <figure key={m.key}>
                <BrewArt method={m.key as BrewKey} title={m.name} />
                <figcaption>
                  <b>{m.name}</b>
                  <em>{m.nameEn}</em>
                  <small>{m.ratio}　{m.time}</small>
                </figcaption>
              </figure>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 計算機 */}
      <section className="rk-section rk-section--tight rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">Calculator</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              先算好水
            </h2>
            <p className="rk-lede" style={{ marginTop: 12 }}>
              選沖煮方式與烘焙度，拉一下粉量，水量、水溫、時間與研磨度就出來了。
            </p>
          </Reveal>
          <Reveal delay={60}>
            <BrewCalc />
          </Reveal>
        </div>
      </section>

      {/* 完整參數表 */}
      <section className="rk-section rk-section--tight rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">Reference</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              五種沖煮方式一覽
            </h2>
            <p className="rk-lede" style={{ marginTop: 12 }}>
              水溫欄位依烘焙度分欄：本店豆單以{ROAST.light.labelZh}為主，
              另有肯亞多門一支{ROAST["light-medium"].labelZh}、林東曼特寧一支{ROAST.medium.labelZh}。
              焙度愈深，水溫就要往下修。
            </p>
          </Reveal>

          <Reveal delay={60} className="rk-tablewrap">
            <table className="rk-table">
              <thead>
                <tr>
                  <th>方式</th>
                  <th>研磨度</th>
                  <th>粉水比</th>
                  <th>水溫・淺焙</th>
                  <th>水溫・淺中焙</th>
                  <th>時間</th>
                </tr>
              </thead>
              <tbody>
                {BREW_METHODS.map((m) => (
                  <tr key={m.key}>
                    <td>
                      <b>{m.name}</b>
                      <br />
                      <span className="rk-mute" style={{ fontSize: 11.5, letterSpacing: "0.06em" }}>
                        {m.nameEn}
                      </span>
                    </td>
                    <td>{m.grind}</td>
                    <td className="rk-num">{m.ratio}</td>
                    <td className="rk-num">
                      {m.temp.light[0]}–{m.temp.light[1]}°C
                    </td>
                    <td className="rk-num">
                      {m.temp["light-medium"][0]}–{m.temp["light-medium"][1]}°C
                    </td>
                    <td className="rk-num">{m.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <p className="rk-caveat" style={{ marginTop: 22, maxWidth: 640 }}>
            以上為業界通行的建議區間（SCA 黃金比例 1:15、淺焙水溫上調、深焙水溫下修），
            不是本店的獨門配方。每一批豆子仍需依實際狀況微調。
          </p>
        </div>
      </section>

      {/* 研磨粗細 */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 26 }}>
            <span className="rk-eyebrow">Grind Size</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              研磨粗細長什麼樣子
            </h2>
            <p className="rk-lede" style={{ marginTop: 12 }}>
              我們一律出原豆、不代客研磨，所以這一段是給你在家磨的參考。
              下面五塊是同一塊面積、同樣的密度，只有顆粒大小在變：
              磨得愈細，水通過得愈慢、萃出的東西愈多——太細會苦澀，太粗會空。
            </p>
          </Reveal>

          <Reveal delay={60}>
            <GrindScale />
          </Reveal>

          <p className="rk-caveat" style={{ marginTop: 22, maxWidth: 640 }}>
            示意圖，比例參考實際粒徑。每台磨豆機的刻度不同，數字不能互相對照——
            用眼睛比對顆粒比看刻度可靠。
          </p>
        </div>
      </section>

      {/* 養豆與保存 */}
      <section className="rk-section rk-section--tight rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 28 }}>
            <span className="rk-eyebrow">Freshness</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              豆子到手之後
            </h2>
          </Reveal>
          <Reveal delay={60} className="rk-cards">
            {FRESHNESS.map((f, i) => (
              <article key={f.title}>
                <div className="rk-cards__art">
                  <FreshnessArt kind={FRESH_ART[i] ?? "store"} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 常見問題 */}
      <section className="rk-section rk-section--tight" style={{ paddingTop: 0 }}>
        <div className="rk-wrap rk-wrap--narrow" style={{ padding: 0 }}>
          <div className="rk-wrap">
            <Reveal style={{ marginBottom: 22 }}>
              <span className="rk-eyebrow">FAQ</span>
              <h2 className="rk-h2" style={{ marginTop: 10 }}>
                常見問題
              </h2>
            </Reveal>

            <Reveal delay={60} className="rk-faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </Reveal>

            <p style={{ marginTop: 30, fontSize: 14.5, color: "var(--rk-ink-2)" }}>
              還有其他問題？直接打給王龍：
              <a className="rk-link" href={`tel:${SITE.phoneTel}`} style={{ marginLeft: 6 }}>
                {SITE.phoneDisplay}
              </a>
              　或
              <Link className="rk-link" href={`${RK}/beans`} style={{ marginLeft: 6 }}>
                回豆單挑一支
              </Link>
              。
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
