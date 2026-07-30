import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "/wenshan";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "文山木材行 形象官網｜形象官網案例 · Avalo 阿瓦羅"
      : "Wenshan Lumber Brand Site｜Brand-Website Case · Avalo",
    description: zh
      ? "為傳承三代的北投木材行打造的形象官網：3D 原木互動主視覺、12 大類木料型錄、詢價清單與線上估價、才數計算機與運費試算——把傳統產業的專業搬上線。"
      : "A brand website for a three-generation lumber yard: interactive 3D log hero, 12-category catalog, quote list and online estimates, plus trade-unit and freight calculators.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "形象官網案例 · 在地企業數位轉型",
    title: "把一甲子的木料專業，\n變成線上就能開始的生意",
    lede: "文山木材行深耕北投關渡近一世紀、傳承三代。我們為第三代接班打造形象官網：3D 原木互動主視覺一眼講出行業，12 大類木料型錄用行內話呈現規格，場域快選引導不懂木頭的客人把需求講清楚，詢價清單＋線上估價表單直通老闆的後台與信箱——還有才數計算機、運費試算這些只有懂行的人才會想到的貼心工具。",
    ctaPrimary: "打造我的形象官網",
    ctaVisit: "造訪文山木材行官網 →",
    stats: [
      { n: "3D 互動", l: "原木斷面主視覺（WebGL）" },
      { n: "12 大類", l: "木料型錄・行內規格" },
      { n: "3 分鐘", l: "場域快選 → 線上估價" },
      { n: "師傅友善", l: "施工場地・工具寄放" },
    ],
    conv: {
      label: "怎麼運作",
      title: "從「不懂木頭」到「送出估價單」",
      desc: "木材行的客人兩極：老師傅講規格，屋主連「才」是什麼都不知道。網站把兩種人都接住——懂的人直接逛型錄勾詢價單，不懂的人選場域就有建議料單，最後都收斂到同一張估價表單，進老闆的後台名單並即時寄信。",
      steps: [
        { t: "選場域", d: "住家／店面／工地⋯⋯選完自動帶出常用料，不用懂行話" },
        { t: "勾料單", d: "型錄逐項「加入詢價單」，規格數量現場填或交給備註" },
        { t: "收報價", d: "送出即進後台名單＋Email 通知，營業時間內回電報價" },
      ],
    },
    arch: {
      label: "系統架構",
      title: "獨立品牌站，掛在既有基礎設施上",
      layers: [
        { t: "品牌前台", d: "獨立設計系統與字體、互動 3D 主視覺、型錄／估價／運送三頁", tag: "體驗" },
        { t: "轉換層", d: "詢價清單（免註冊）、場域引導、估價表單：驗證＋honeypot＋rate limit", tag: "轉換" },
        { t: "後台與營運", d: "估價單進後台名單、Email 即時通知；綁自有網域一鍵切換", tag: "營運" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "傳統產業的專業，用數位的方式講出來",
      items: [
        { t: "3D 原木互動主視覺", d: "WebGL 原木隨游標傾斜、點擊鋸下一片露出新年輪——第一眼就知道這是誰的行業。" },
        { t: "12 大類木料型錄", d: "角材、夾板、木心板到南方松，用分／寸／尺／才的行內規格完整呈現。" },
        { t: "場域快選", d: "選「住家／店面／工地⋯」自動列出常用料，不懂木頭也能把需求講清楚。" },
        { t: "詢價清單", d: "逛型錄邊勾邊加，免註冊免購物車，進估價頁自動帶入。" },
        { t: "才數計算機", d: "輸入寸×寸×尺立刻換算才數，展現只有行內才懂的貼心。" },
        { t: "運費試算", d: "雙北免運一目瞭然，外縣市選地區即估運費，與公告價同源不打架。" },
        { t: "線上估價表單", d: "三步驟三分鐘，送出即入後台名單並寄信通知，防機器人防灌水。" },
        { t: "師傅設施專區", d: "把「可現場施工、可寄放工具」這個同業少有的優勢做成獨立段落與 FAQ，直接對木工師傅溝通。" },
        { t: "在地 SEO 佈局", d: "商家結構化資料（地址／營業時間／座標），綁定網域後即可搶在地搜尋。" },
      ],
    },
    why: {
      label: "為什麼是形象官網",
      title: "不用大系統，也能讓老店在線上被找到、被信任",
      items: [
        { t: "一眼建立信任", d: "近百年老店的專業與親切，用設計與互動說出來，不靠華麗詞藻。" },
        { t: "詢價直接變名單", d: "每張估價單都進自有後台與信箱，不漏接、不依賴第三方平台。" },
        { t: "隨時可以長大", d: "今天是形象與估價，之後要加線上付款、會員回購都能疊加。" },
      ],
    },
    finalCta: {
      title: "你的產業，也值得一個這樣的官網",
      desc: "不論是木材行、玻璃行還是任何專業行業，我們都能把你的專業變成線上的信任與訂單。先看看文山木材行的實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪文山木材行官網 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Brand-Website Case · Local Business Digitalization",
    title: "Turning a century of lumber expertise\ninto business that starts online",
    lede: "Wenshan Lumber has served Beitou's Guandu area for nearly a century across three generations. For the third generation we built a brand website: an interactive 3D log hero says the trade at a glance, a 12-category catalog speaks the industry's units, a venue picker helps laypeople state their needs, and a quote list plus online estimate form feed straight into the owner's back office and inbox — with trade-unit and freight calculators only an insider would think of.",
    ctaPrimary: "Build my brand site",
    ctaVisit: "Visit the Wenshan Lumber site →",
    stats: [
      { n: "3D hero", l: "Interactive log cross-section (WebGL)" },
      { n: "12 categories", l: "Catalog in trade units" },
      { n: "3 minutes", l: "Venue picker → online estimate" },
      { n: "Pro-friendly", l: "On-site workspace & tool storage" },
    ],
    conv: {
      label: "How it works",
      title: "From \"I don't know wood\" to a submitted estimate",
      desc: "Lumber customers are polar opposites: pros speak specs, homeowners don't know the units. The site serves both — pros browse the catalog and tick a quote list, laypeople pick a venue and get a suggested list; both converge on one estimate form that lands in the owner's back office with an instant email.",
      steps: [
        { t: "Pick a venue", d: "Home / shop / job site… auto-suggests the usual materials, no jargon needed" },
        { t: "Tick materials", d: "Add catalog items to the quote list; specs inline or in the notes" },
        { t: "Get the quote", d: "Submit → back-office lead + email; a call back within business hours" },
      ],
    },
    arch: {
      label: "Architecture",
      title: "A standalone brand site on existing infrastructure",
      layers: [
        { t: "Brand front-end", d: "Own design system and type, interactive 3D hero, catalog/quote/delivery pages", tag: "Experience" },
        { t: "Conversion", d: "No-signup quote list, venue guidance, estimate form: validation + honeypot + rate limit", tag: "Convert" },
        { t: "Back office & ops", d: "Estimates land as leads with instant email; one-flip custom-domain switch", tag: "Ops" },
      ],
    },
    feat: {
      label: "Features",
      title: "Traditional expertise, told digitally",
      items: [
        { t: "Interactive 3D log hero", d: "A WebGL log tilts with the cursor; click to saw a slice and reveal fresh rings." },
        { t: "12-category catalog", d: "Studs to plywood to southern pine, in the trade's own units." },
        { t: "Venue picker", d: "Choose home/shop/site and get the usual materials listed — no expertise required." },
        { t: "Quote list", d: "Tick while browsing, no signup, auto-merged into the estimate form." },
        { t: "Trade-unit calculator", d: "Instant conversion to 才 — insider-level thoughtfulness." },
        { t: "Freight estimator", d: "Free delivery zones at a glance; out-of-area fees estimated from one source of truth." },
        { t: "Online estimate form", d: "Three steps in three minutes; lands as a lead with email notification, bot-protected." },
        { t: "Pro-facility section", d: "A dedicated section and FAQ for on-site workspace and tool storage — a rare edge, spoken directly to carpenters." },
        { t: "Local SEO groundwork", d: "Store structured data (address/hours/geo), ready to rank once the domain binds." },
      ],
    },
    why: {
      label: "Why a brand website",
      title: "No big system needed for an old shop to be found and trusted online",
      items: [
        { t: "Trust at first sight", d: "A century of craft and warmth, told through design and interaction." },
        { t: "Inquiries become leads", d: "Every estimate lands in your own back office and inbox — no platform lock-in." },
        { t: "Room to grow", d: "Brand and estimates today; payments and memberships can stack on later." },
      ],
    },
    finalCta: {
      title: "Your trade deserves a site like this too",
      desc: "Lumber, glass or any specialist trade — we turn your expertise into online trust and orders. See the live Wenshan Lumber site first.",
      btn: "Book a free consultation",
      visit: "Visit the Wenshan Lumber site →",
    },
  },
} as const;

export default async function WenshanCase({
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

      {/* How it works */}
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

      {/* Why */}
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
