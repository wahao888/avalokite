import type { Metadata } from "next";
import Link from "next/link";
import { listBeans } from "../_data/beans";
import { RK, SITE } from "../_data/site";
import Reveal from "../_components/Reveal";

export const metadata: Metadata = {
  title: "關於日卡地",
  description:
    "日卡地是台東縣鹿野鄉永安村的阿美族部落，族語 Rekat 意為「水乾」。2012 年烘豆師王龍搬進部落，開始無農藥無肥料的自然農耕，也把三十年的烘豆帶了進來。",
  alternates: { canonical: "/about" },
};

/** 手繪的日卡地：兩道山稜、一條遇雨則漲雨停則乾的溪、幾株咖啡樹 */
function Valley() {
  return (
    <svg viewBox="0 0 640 300" role="img" aria-label="日卡地部落的示意風景" style={{ width: "100%", height: "auto" }}>
      {/* 遠山 */}
      <path
        d="M0 176 C 70 128 118 150 168 118 C 224 82 268 118 320 96 C 372 74 420 108 474 92 C 528 76 590 108 640 90 L640 300 L0 300 Z"
        fill="var(--rk-paper-3)"
        stroke="var(--rk-line)"
        strokeWidth="1.2"
      />
      {/* 近山 */}
      <path
        d="M0 216 C 76 186 130 202 190 176 C 252 150 300 178 358 162 C 420 144 480 172 540 158 C 588 147 616 158 640 152 L640 300 L0 300 Z"
        fill="var(--rk-paper-2)"
        stroke="var(--rk-line)"
        strokeWidth="1.2"
      />
      {/* 溪。實線是雨後的水，虛線是雨停之後只剩下的河床 */}
      <path
        d="M40 300 C 130 258 150 236 236 226 C 320 216 358 236 440 222 C 520 208 570 214 640 204"
        fill="none"
        stroke="var(--rk-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M40 300 C 130 258 150 236 236 226 C 320 216 358 236 440 222 C 520 208 570 214 640 204"
        fill="none"
        stroke="var(--rk-accent)"
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.12"
      />
      <path
        d="M56 300 C 146 260 166 240 250 232 C 332 224 368 242 448 230"
        fill="none"
        stroke="var(--rk-mute)"
        strokeWidth="1"
        strokeDasharray="3 6"
        opacity="0.7"
      />

      {/* 幾株樹。同一個形狀換高度與傾角，像一排真的長出來的東西 */}
      {[
        [96, 250, 1, -4],
        [148, 240, 0.85, 3],
        [500, 246, 0.95, 2],
        [556, 254, 1.1, -3],
        [590, 240, 0.8, 4],
      ].map(([x, y, s, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s}) rotate(${r})`}>
          <path d="M0 0 L0 -26" stroke="var(--rk-ink-2)" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M0 -26 C -13 -30 -17 -40 -14 -47 C -6 -48 0 -40 0 -32 C 0 -40 6 -48 14 -47 C 17 -40 13 -30 0 -26 Z"
            fill="var(--rk-paper-3)"
            stroke="var(--rk-ink-2)"
            strokeWidth="1.3"
          />
          <circle cx="-7" cy="-33" r="2.1" fill="#B23A2E" />
          <circle cx="6" cy="-37" r="2.1" fill="#B23A2E" />
        </g>
      ))}

      {/* 一間屋子 */}
      <g transform="translate(300 236)">
        <path d="M-22 0 L-22 -16 L0 -28 L22 -16 L22 0 Z" fill="var(--rk-paper-2)" stroke="var(--rk-ink-2)" strokeWidth="1.4" />
        <path d="M-26 -15 L0 -30 L26 -15" fill="none" stroke="var(--rk-ink-2)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="-6" y="-11" width="12" height="11" fill="var(--rk-accent)" opacity="0.75" />
        {/* 炊煙 */}
        <path
          d="M14 -30 C 18 -37 10 -41 14 -48 C 18 -54 12 -57 15 -62"
          fill="none"
          stroke="var(--rk-mute)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

const arrow = (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
    <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export default function AboutPage() {
  const beans = listBeans();

  return (
    <>
      <section className="rk-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 76px) clamp(28px, 4vw, 48px)" }}>
        <Reveal className="rk-wrap--narrow" style={{ padding: 0 }}>
          <span className="rk-eyebrow">About・{SITE.region}</span>
          <h1 className="rk-h1" style={{ marginTop: 12 }}>
            雨來則漲，
            <br />
            雨停則乾
          </h1>
          <p className="rk-lede" style={{ marginTop: 20 }}>
            {SITE.nameOrigin}部落就用這件事替自己命名。
            我們把這個名字的羅馬拼音留了下來，當成這間烘豆坊的名字。
          </p>
        </Reveal>
      </section>

      <section className="rk-wrap" style={{ paddingBottom: "clamp(32px, 5vw, 60px)" }}>
        <Reveal>
          <Valley />
        </Reveal>
        <p className="rk-caveat" style={{ marginTop: 14 }}>
          示意插畫，非實景。
        </p>
      </section>

      <hr className="rk-rule" />

      {/* 烘豆師 */}
      <section className="rk-section">
        <div className="rk-wrap rk-split rk-split--side">
          <Reveal>
            <span className="rk-eyebrow">The Roaster</span>
            <h2 className="rk-h2" style={{ marginTop: 12 }}>
              王龍，
              <br />
              烘了三十年
            </h2>
            <div className="rk-facts" style={{ marginTop: 34, gridTemplateColumns: "repeat(2, 1fr)" }}>
              <div>
                <b>
                  {SITE.roaster.years}
                  <sup>年</sup>
                </b>
                <span>烘豆資歷</span>
              </div>
              <div>
                <b>{SITE.roaster.settledYear}</b>
                <span>進駐日卡地</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="rk-body">
            <p style={{ fontSize: 16.5, lineHeight: 2 }}>
              {SITE.roaster.settledYear} 年夏天，王龍搬到台東鹿野的日卡地部落，
              開始無農藥、無肥料的自然農耕，並帶著部落族人與新移民一起做。
              農莊本來就有各種作物，但這個網站只講一件事——咖啡豆。
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 2 }}>
              三十年的烘豆資歷不是拿來當標語的。它的意思是：
              一鍋豆子從入豆到下豆的十分鐘裡，該在哪一秒調火、哪一秒停手，
              已經不需要看錶了。
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 2 }}>
              豆單上這 {beans.length} 支生豆來自六個國家，
              有競標批次的藝伎、有法定分級的藍山、有實驗性極高的雙重厭氧。
              它們被同一雙手、同一台機器、同一套判斷烘出來。
            </p>
          </Reveal>
        </div>
      </section>

      {/* 三個原則 */}
      <section className="rk-section rk-section--alt">
        <div className="rk-wrap">
          <Reveal style={{ marginBottom: 32, maxWidth: 620 }}>
            <span className="rk-eyebrow">Principles</span>
            <h2 className="rk-h2" style={{ marginTop: 10 }}>
              我們只守三件事
            </h2>
          </Reveal>

          <Reveal delay={60} className="rk-cards">
            <article>
              <h3>只買喝得出產地的生豆</h3>
              <p>
                豆單上沒有配方豆、沒有調和。每一支都寫得出國家、產區、處理法，
                寫不出來的我們不進。這也是價格從 400 到 1800 都有的原因——
                差別在生豆，不在包裝。
              </p>
            </article>
            <article>
              <h3>火停在一爆之後、二爆之前</h3>
              <p>
                高單價的生豆買的是產地風味。烘到二爆，那些花香果酸會被焙烤味蓋掉，
                所有豆子都會開始喝起來一樣。所以整份豆單以淺焙為主，
                只有需要它的豆子才會再往前走半步——例如濕剝的曼特寧，淺焙撐不起它的草本厚度。
              </p>
            </article>
            <article>
              <h3>訂單確認後才烘</h3>
              <p>
                咖啡的賞味期是烘後七到三十天。先烘好放著等人買，等於把最好的那三週先用掉。
                所以我們收到訂單才進滾筒，約 2–3 個工作天出貨。
              </p>
            </article>
          </Reveal>
        </div>
      </section>

      {/* 一句話 */}
      <section className="rk-section rk-section--ink">
        <div className="rk-wrap rk-wrap--narrow" style={{ textAlign: "center", padding: 0 }}>
          <Reveal>
            <blockquote className="rk-quote">
              {SITE.tagline}
              <cite>王龍・{SITE.nameZh}</cite>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* 聯絡 */}
      <section className="rk-section rk-section--tight">
        <div className="rk-wrap rk-split">
          <Reveal>
            <span className="rk-eyebrow">Contact</span>
            <h2 className="rk-h2" style={{ marginTop: 10, fontSize: "clamp(22px, 3vw, 30px)" }}>
              找我們
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <dl className="rk-spec" style={{ marginTop: 0 }}>
              <div>
                <dt>電話</dt>
                <dd>
                  <a className="rk-link" href={`tel:${SITE.phoneTel}`}>
                    {SITE.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt>地址</dt>
                <dd>{SITE.addressFull}</dd>
              </div>
              <div>
                <dt>LINE</dt>
                <dd>
                  <a className="rk-link" href={SITE.line} target="_blank" rel="noreferrer noopener">
                    加好友問問題
                  </a>
                </dd>
              </div>
              <div>
                <dt>Facebook</dt>
                <dd>
                  <a className="rk-link" href={SITE.facebook} target="_blank" rel="noreferrer noopener">
                    日卡地自然農莊 ReKat Farm
                  </a>
                </dd>
              </div>
              <div>
                <dt>訂購</dt>
                <dd>
                  <Link className="rk-link" href={`${RK}/beans`}>
                    線上豆單
                  </Link>
                  　銀行匯款 / ATM・貨到付款
                </dd>
              </div>
            </dl>

            <p style={{ marginTop: 26 }}>
              <Link className="rk-arrow" href={`${RK}/beans`} style={{ color: "var(--rk-accent)" }}>
                看本期豆單
                {arrow}
              </Link>
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
