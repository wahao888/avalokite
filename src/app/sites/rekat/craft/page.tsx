import type { Metadata } from "next";
import Link from "next/link";
import { listBeans, usedFamilies, usedProcesses, type ProcessKey } from "../_data/beans";
import type { FamilyKey } from "../_data/flavor-wheel";
import { RK } from "../_data/site";
import FlavorWheel from "../_components/FlavorWheel";
import OriginMap from "../_components/OriginMap";
import ProcessDiagram from "../_components/ProcessDiagram";
import Reveal from "../_components/Reveal";
import RoastCurve from "../_components/RoastCurve";

export const metadata: Metadata = {
  title: "咖啡知識：風味輪、處理法、烘焙度",
  description:
    "咖啡風味輪怎麼讀？日曬、水洗、蜜處理、厭氧發酵差在哪？一爆之後發生了什麼事？REKAT ROASTERY 用互動圖解說明精品咖啡的三個基本座標：處理法、烘焙度、產地。",
  alternates: { canonical: "/craft" },
};

const arrow = (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
    <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export default function CraftPage() {
  const beans = listBeans();
  const famCounts = Object.fromEntries(usedFamilies().map((f) => [f.key, f.count])) as Partial<
    Record<FamilyKey, number>
  >;
  const procCounts = Object.fromEntries(
    usedProcesses().map((p) => [p.key, beans.filter((b) => b.process === p.key).length]),
  ) as Partial<Record<ProcessKey, number>>;

  return (
    <>
      <section className="rk-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 76px) clamp(32px, 5vw, 56px)" }}>
        <Reveal className="rk-wrap--narrow" style={{ padding: 0 }}>
          <span className="rk-eyebrow">Craft</span>
          <h1 className="rk-h1" style={{ marginTop: 12 }}>
            一支豆子的
            <br />
            三個座標
          </h1>
          <p className="rk-lede" style={{ marginTop: 20 }}>
            豆單上每一行都在講同三件事：它長在哪裡、果實怎麼被處理、火停在哪一秒。
            這三個座標決定了杯子裡的一切，剩下的都是形容詞。
          </p>
        </Reveal>
      </section>

      <hr className="rk-rule" />

      {/* ① 風味輪 */}
      <section className="rk-section">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 40, maxWidth: 660 }}>
            <span className="rk-eyebrow">01 — Flavor Wheel</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              先有語言，才有味覺
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              人喝得出來的東西，遠比說得出來的多。風味輪的用途是把「說不上來」變成「說得出來」——
              先落在一個大方向，再一層層往外收斂。這是 SCA 與 World Coffee Research
              在 2016 年共同修訂的版本，也是全世界杯測師共用的那套座標。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <FlavorWheel counts={famCounts} />
          </Reveal>

          <Reveal delay={120} className="rk-cards" style={{ marginTop: 44 }}>
            <article>
              <h3>由內而外，不要跳級</h3>
              <p>
                先問「這是果香還是堅果」，再問「是莓果還是柑橘」，最後才問「是藍莓還是黑莓」。
                跳過中間那層，通常只會得到一個自己也不確定的詞。
              </p>
            </article>
            <article>
              <h3>青草味與紙味不是風味，是警訊</h3>
              <p>
                輪子上有兩個家族是拿來抓問題的：青草／蔬菜代表未熟豆或烘焙不足，
                紙味／霉味代表倉儲或處理出了狀況。喝到這兩類，該回頭查的是流程不是舌頭。
              </p>
            </article>
            <article>
              <h3>「焙烤」愈重，產地愈輕</h3>
              <p>
                焙烤家族的風味全部來自烘焙，不是來自土地。它的比重愈高，
                就代表你付錢買的產地特性被燒掉愈多——這是本店以淺焙為主的理由。
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ② 處理法 */}
      <section className="rk-section rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 40, maxWidth: 660 }}>
            <span className="rk-eyebrow">02 — Processing</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              果肉留不留，是一整套決定
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              咖啡豆是果實裡的種子。從樹上摘下來到變成生豆之間，果實要被剝掉幾層、
              在什麼條件下發酵多久，決定了甜感、乾淨度與酒香的比例。
              新手建議的探索順序是：水洗 → 蜜處理 → 日曬 → 厭氧發酵。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <ProcessDiagram counts={procCounts} />
          </Reveal>
        </div>
      </section>

      {/* ③ 烘焙 */}
      <section className="rk-section">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 40, maxWidth: 660 }}>
            <span className="rk-eyebrow">03 — Roasting</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              十分鐘，兩百度，一次不能重來
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              烘豆是把一鍋綠色的種子，在十分鐘內帶過脫水、梅納反應與一爆，
              然後在正確的那一秒停下來。曲線的每一段都在決定杯子裡的某一件事。
            </p>
          </Reveal>

          <Reveal delay={80} style={{ maxWidth: 760 }}>
            <RoastCurve />
          </Reveal>

          <p className="rk-caveat" style={{ marginTop: 24, maxWidth: 620 }}>
            上圖為淺焙的典型曲線示意，非本店任何一支豆子的實際烘焙紀錄。
            實際曲線依生豆的含水率、密度與批次大小逐鍋調整。
          </p>
        </div>
      </section>

      {/* ④ 產地 */}
      <section className="rk-section rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 36, maxWidth: 660 }}>
            <span className="rk-eyebrow">04 — Origin</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              海拔每高一百公尺，果實就長慢一點
            </h2>
            <p className="rk-lede" style={{ marginTop: 14 }}>
              高海拔的日夜溫差讓咖啡果實成熟得慢，糖分累積得久，豆體也更緻密。
              這是為什麼產區資訊值得被寫在包裝上——它不是產地行銷，是風味的成因。
            </p>
          </Reveal>

          <Reveal delay={80}>
            <OriginMap />
          </Reveal>
        </div>
      </section>

      {/* 精品咖啡的定義 */}
      <section className="rk-section rk-section--ink">
        <div className="rk-wrap rk-split rk-split--side">
          <Reveal>
            <span className="rk-eyebrow">Specialty</span>
            <h2 className="rk-h2" style={{ marginTop: 12 }}>
              「精品」是一條線，
              <br />
              不是一種說法
            </h2>
          </Reveal>
          <Reveal delay={100} className="rk-body">
            <p style={{ fontSize: 16.5, lineHeight: 2 }}>
              SCA 對精品咖啡的定義有一個具體門檻：經過標準杯測流程，總分 80 分以上。
              80 分以下的稱為商業咖啡。這條線同時要求生豆的瑕疵率、處理的一致性，
              以及從種植、處理、烘焙到沖煮每一段都不能出錯。
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 2 }}>
              也就是說，精品不是形容詞。它是一個會被扣分的評分表。
            </p>
            <Link className="rk-arrow" href={`${RK}/beans`} style={{ marginTop: 24 }}>
              看本期 {beans.length} 支豆單
              {arrow}
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
