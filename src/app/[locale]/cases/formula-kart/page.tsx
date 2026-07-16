import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://gtclub.tw/formula-kart/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "Formula Kart 3D 賽車遊戲｜完全客製案例 · Avalo 阿瓦羅"
      : "Formula Kart — 3D Racing Game｜Fully-Custom Case · Avalo",
    description: zh
      ? "Three.js／WebGL 打造、免安裝就能玩的瀏覽器 3D 賽車遊戲，含 3 賽道、9 車、動態天氣、44 項成就與最多 10 人即時多人競速。"
      : "A no-install browser 3D racing game built with Three.js/WebGL — 3 tracks, 9 cars, dynamic weather, 44 achievements and up to 10-player real-time racing.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · 互動遊戲 × Three.js",
    title: "把 3D 多人賽車，\n搬進瀏覽器",
    lede: "我們用 Three.js／WebGL 從零打造的 F1 風格 Q 版 3D 賽車遊戲：3 條賽道、9 台賽車、三種 AI、動態天氣、漂移與加速、車庫商城、44 項成就，還有最多 10 人的 WebSocket 即時多人房間——打開瀏覽器就能玩，免下載、免安裝。連「即時多人 3D 遊戲」這種等級的東西，我們也做得出來、也讓它穩定上線。",
    ctaPrimary: "聊聊我的互動體驗點子",
    ctaVisit: "立即試玩 Formula Kart →",
    stats: [
      { n: "10 人", l: "WebSocket 即時同場競速" },
      { n: "3 賽道 · 9 車", l: "動態天氣 × 三種 AI" },
      { n: "44 項", l: "成就系統，越玩越上癮" },
      { n: "免安裝", l: "打開瀏覽器就能玩" },
    ],
    conv: {
      label: "怎麼玩",
      title: "打開網頁，直接尬車",
      desc: "一般人想到 3D 遊戲，會以為要下載一個大程式。我們把它做進瀏覽器：點開網址，畫面就是即時運算的 3D 賽道。操作有深度——漂移蓄能、釋放加速；也有社交性——開個房間，最多 10 個人同場競速。想單練就有三種 AI 陪你跑。",
      steps: [
        { t: "免安裝開玩", d: "點開網址就是即時 3D 賽車，無需下載任何程式" },
        { t: "漂移與加速", d: "Space 漂移蓄能、E 釋放加速，操作有技巧與深度" },
        { t: "10 人連線對戰", d: "開房間即時多人競速，或選三種 AI 難度單練" },
      ],
    },
    arch: {
      label: "技術架構",
      title: "從即時渲染到多人同步，全自研",
      layers: [
        { t: "前端遊戲引擎", d: "Three.js／WebGL 即時 3D 渲染、車輛物理、漂移與動態天氣", tag: "渲染" },
        { t: "即時連線層", d: "WebSocket 伺服器（PM2，記憶體上限控管），最多 10 人同房同步", tag: "多人" },
        { t: "內容與存檔", d: "車庫商城、44 項成就、賽道與車輛內容，localStorage 存檔", tag: "內容" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "一款完整的遊戲，不是 demo",
      items: [
        { t: "三條賽道 × 動態天氣", d: "不同賽道搭配天氣變化，每一局的手感與策略都不一樣。" },
        { t: "9 台賽車 × 車庫商城", d: "收集、選車與升級的養成樂趣，給玩家持續回來的理由。" },
        { t: "漂移與加速系統", d: "Space 漂移蓄能、E 釋放加速，拉開新手與高手的操作差距。" },
        { t: "三種 AI 難度", d: "從休閒到硬核，沒有連線也能一個人玩得盡興。" },
        { t: "最多 10 人多人房間", d: "WebSocket 即時同步位置與狀態，和朋友同場尬車。" },
        { t: "44 項成就系統", d: "明確目標與里程碑，大幅提升重玩動機與黏著度。" },
        { t: "免安裝跨瀏覽器", d: "桌機瀏覽器打開網址就能玩，分享一條連結就到位。" },
        { t: "完整測試與壓測", d: "typecheck／單元／E2E／負載測試，多人連線上線也穩。" },
      ],
    },
    why: {
      label: "為什麼找我們做",
      title: "連遊戲都做得出來，你的點子當然可以",
      items: [
        { t: "從玩法到引擎全自研", d: "不是買現成模板換皮，每個系統都能照你的創意打造。" },
        { t: "效能與穩定是基本功", d: "伺服器記憶體控管加上負載測試，即時多人也不掉線。" },
        { t: "能一直長大", d: "加賽道、加車、加玩法、加排行榜或行動版，都能持續擴充。" },
      ],
    },
    finalCta: {
      title: "想用互動體驗，讓品牌被記住？",
      desc: "從遊戲化行銷、互動 3D 體驗到完整的多人遊戲，只要想得到，我們都能做。也歡迎先玩玩看已上線的 Formula Kart。",
      btn: "預約免費諮詢",
      visit: "立即試玩 Formula Kart →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · Interactive Game × Three.js",
    title: "Bring 3D multiplayer racing\ninto the browser",
    lede: "An F1-style chibi 3D racing game we built from scratch with Three.js/WebGL: 3 tracks, 9 cars, three AI levels, dynamic weather, drift & boost, a garage shop, 44 achievements, and up to 10-player real-time WebSocket rooms — playable right in the browser, no download, no install. Even something as demanding as a real-time multiplayer 3D game, we can build and ship reliably.",
    ctaPrimary: "Talk about my interactive idea",
    ctaVisit: "Play Formula Kart now →",
    stats: [
      { n: "10 players", l: "Real-time WebSocket racing" },
      { n: "3 tracks · 9 cars", l: "Dynamic weather × 3 AI" },
      { n: "44", l: "Achievements to chase" },
      { n: "No install", l: "Just open the browser" },
    ],
    conv: {
      label: "How to play",
      title: "Open the page, start racing",
      desc: "People assume a 3D game means a big download. We built it into the browser: open the URL and you're on a real-time 3D track. There's depth — charge a drift, release a boost — and there's social play: open a room and race up to 10 people at once. Prefer solo? Three AI levels have you covered.",
      steps: [
        { t: "No-install play", d: "Open the URL and you're in real-time 3D — nothing to download" },
        { t: "Drift & boost", d: "Space to charge a drift, E to release boost — real skill depth" },
        { t: "10-player racing", d: "Open a room for real-time multiplayer, or race three AI levels solo" },
      ],
    },
    arch: {
      label: "Architecture",
      title: "From real-time rendering to multiplayer sync, all in-house",
      layers: [
        { t: "Game engine", d: "Three.js/WebGL real-time 3D rendering, vehicle physics, drift and weather", tag: "Render" },
        { t: "Real-time layer", d: "WebSocket server (PM2, capped memory), up to 10 players synced per room", tag: "Multiplayer" },
        { t: "Content & saves", d: "Garage shop, 44 achievements, tracks and cars, localStorage saves", tag: "Content" },
      ],
    },
    feat: {
      label: "Features",
      title: "A complete game, not a demo",
      items: [
        { t: "3 tracks × dynamic weather", d: "Different tracks and weather make every race feel and play differently." },
        { t: "9 cars × garage shop", d: "Collect, choose and upgrade — a reason for players to keep coming back." },
        { t: "Drift & boost system", d: "Space to charge, E to release — separating beginners from pros." },
        { t: "Three AI levels", d: "From casual to hardcore, fully enjoyable solo without a connection." },
        { t: "Up to 10-player rooms", d: "WebSocket syncs position and state in real time — race friends live." },
        { t: "44 achievements", d: "Clear goals and milestones that boost replay and stickiness." },
        { t: "No-install, cross-browser", d: "Open the URL on a desktop browser — share one link and you're set." },
        { t: "Full tests & load testing", d: "Typecheck / unit / E2E / load tests — stable even with live multiplayer." },
      ],
    },
    why: {
      label: "Why work with us",
      title: "If we can build a game, your idea is well within reach",
      items: [
        { t: "In-house from engine up", d: "Not a reskinned template — every system built around your creative idea." },
        { t: "Performance & stability", d: "Capped server memory plus load testing keep real-time multiplayer online." },
        { t: "Grows with you", d: "More tracks, cars, modes, leaderboards or a mobile version — all extendable." },
      ],
    },
    finalCta: {
      title: "Want interactive experiences that make your brand memorable?",
      desc: "From gamified marketing and interactive 3D experiences to full multiplayer games — if you can imagine it, we can build it. Feel free to play the live Formula Kart first.",
      btn: "Book a free consultation",
      visit: "Play Formula Kart now →",
    },
  },
} as const;

export default async function FormulaKartCase({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = C[(locale === "en" ? "en" : "zh-TW") as Locale];

  return (
    <main className="page-wrap fa">
      <Link href={{ pathname: "/", hash: "cases" }} className="fa-back">{c.back}</Link>

      {/* Hero */}
      <header className="fa-hero">
        <div className="mono-label">{c.label}</div>
        <h1 className="fa-title">{c.title}</h1>
        <p className="fa-lede">{c.lede}</p>
        <div className="fa-hero-cta">
          <Link href={{ pathname: "/", hash: "contact" }} className="btn-primary">{c.ctaPrimary}</Link>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">{c.ctaVisit}</a>
        </div>
      </header>

      {/* Stats */}
      <section className="fa-stats">
        {c.stats.map((s) => (
          <div className="fa-stat" key={s.l}>
            <div className="fa-stat-n">{s.n}</div>
            <div className="fa-stat-l">{s.l}</div>
          </div>
        ))}
      </section>

      {/* How to play — flow */}
      <section className="fa-section">
        <div className="mono-label">{c.conv.label}</div>
        <h2 className="fa-h2">{c.conv.title}</h2>
        <p className="fa-p">{c.conv.desc}</p>
        <div className="fa-flow">
          {c.conv.steps.map((s, i) => (
            <div className="fa-flow-item" key={s.t}>
              <div className="fa-flow-node">
                <span className="fa-flow-num">{i + 1}</span>
                {i < c.conv.steps.length - 1 && <span className="fa-flow-arrow">→</span>}
              </div>
              <div className="fa-flow-t">{s.t}</div>
              <div className="fa-flow-d">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="fa-section">
        <div className="mono-label">{c.arch.label}</div>
        <h2 className="fa-h2">{c.arch.title}</h2>
        <div className="fa-arch">
          {c.arch.layers.map((l, i) => (
            <div className="fa-arch-row" key={l.t}>
              <div className="fa-arch-tag">{l.tag}</div>
              <div className="fa-arch-card">
                <div className="fa-arch-t">{l.t}</div>
                <div className="fa-arch-d">{l.d}</div>
              </div>
              {i < c.arch.layers.length - 1 && <div className="fa-arch-down">↓</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="fa-section">
        <div className="mono-label">{c.feat.label}</div>
        <h2 className="fa-h2">{c.feat.title}</h2>
        <div className="fa-feat-grid">
          {c.feat.items.map((f) => (
            <div className="fa-feat" key={f.t}>
              <div className="fa-feat-t">{f.t}</div>
              <div className="fa-feat-d">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="fa-section">
        <div className="mono-label">{c.why.label}</div>
        <h2 className="fa-h2">{c.why.title}</h2>
        <div className="fa-why">
          {c.why.items.map((w, i) => (
            <div className="fa-why-item" key={w.t}>
              <div className="fa-why-num">0{i + 1}</div>
              <div className="fa-why-t">{w.t}</div>
              <div className="fa-why-d">{w.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="fa-final">
        <h2 className="fa-final-t">{c.finalCta.title}</h2>
        <p className="fa-final-d">{c.finalCta.desc}</p>
        <div className="fa-hero-cta" style={{ justifyContent: "center" }}>
          <Link href={{ pathname: "/", hash: "contact" }} className="btn-primary">{c.finalCta.btn}</Link>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost fa-final-visit">{c.finalCta.visit}</a>
        </div>
      </section>
    </main>
  );
}
