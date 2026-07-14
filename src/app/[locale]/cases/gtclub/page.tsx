import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://gtclub.tw/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "GT Club 台灣共好交流協會官網｜完全客製案例 · Avalo 阿瓦羅"
      : "GT Club Taiwan｜Fully-Custom Case · Avalo",
    description: zh
      ? "明暗雙主題＋動效的品牌官網、三大主題專區、加入表單與電子報一鍵轉換、造訪分析——為協會打造的社群經營平台，完全客製。"
      : "A brand website with light/dark themes, topic hubs, one-tap join & newsletter conversion and visit analytics — a fully-custom community platform.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · 品牌官網 × 社群經營",
    title: "讓理念找到夥伴，\n一起走得更遠",
    lede: "我們為台灣共好交流協會（GT 俱樂部）從零打造的品牌官網與社群經營平台：用明暗雙主題與流暢動效建立信任，AI／Web3／永續三大主題專區與成果展示傳達理念，再用加入表單與電子報把訪客變成夥伴——送出即落地、即時通知，後台還能看造訪分析。一個已上線、正在幫協會招募發起夥伴的官網。",
    ctaPrimary: "打造我的品牌官網",
    ctaVisit: "造訪 GT Club 網站 →",
    stats: [
      { n: "明暗雙主題", l: "深淺切換 × 流暢動效" },
      { n: "三大主題", l: "AI／Web3／永續 專區" },
      { n: "一鍵加入", l: "表單送出即通知落地" },
      { n: "發起人數", l: "招募進度即時統計" },
    ],
    conv: {
      label: "怎麼運作",
      title: "從被理念打動，到願意一起走",
      desc: "社群要壯大，靠的是讓對的人「感覺對了就想加入」。我們把整段體驗設計成一條轉換路徑：先用專業的品牌視覺與動效建立信任，再用主題與成果傳達理念，最後把加入與訂閱變成一鍵的事——訪客零負擔，協會這端拿到的是已通知、已落地的名單。",
      steps: [
        { t: "沉浸品牌體驗", d: "明暗主題、reveal 動效與專業視覺，第一眼就有信任感" },
        { t: "被理念打動", d: "AI／Web3／永續三大主題與重點成果，傳達協會能量" },
        { t: "一鍵成為夥伴", d: "加入表單或訂閱電子報，送出即落地並即時通知管理者" },
      ],
    },
    arch: {
      label: "系統架構",
      title: "從前台體驗到後台名單，一條龍",
      layers: [
        { t: "品牌前台", d: "首頁主視覺、關於、三大主題、成果與活動，明暗主題與動效", tag: "體驗" },
        { t: "轉換層", d: "加入表單與電子報：zod 驗證、honeypot 防垃圾、rate limit", tag: "轉換" },
        { t: "後台與營運", d: "名單寫入伺服器落地檔、Email 即時通知、造訪分析（IP／地理／bot）", tag: "營運" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "一個官網，撐起品牌與社群經營",
      items: [
        { t: "三大主題專區", d: "AI／Web3／永續各有專屬內容與視覺，清楚傳達協會的關注面向。" },
        { t: "成果展示", d: "呈現重點計畫（含 AI 會計、AI 會議整合），用作品建立說服力。" },
        { t: "活動照片牆與跑馬燈", d: "動態呈現社群活動，增加參與感與真實感。" },
        { t: "加入申請表單", d: "zod 驗證＋honeypot 防垃圾＋rate limit，送出即寫入落地檔並通知。" },
        { t: "電子報訂閱", d: "收集名單、持續經營關係，把一次造訪變成長期連結。" },
        { t: "發起人數統計", d: "招募進度即時可視化，營造「一起參與」的動能。" },
        { t: "明暗雙主題與動效", d: "framer-motion reveal 與深淺切換，帶出現代品牌質感。" },
        { t: "造訪通知與分析", d: "每次造訪含 IP、地理位置與 bot 判斷通知，掌握流量與風險。" },
      ],
    },
    why: {
      label: "為什麼選完全客製",
      title: "品牌與社群是你的，官網就該完全長成你的樣子",
      items: [
        { t: "為品牌量身打造", d: "視覺、動效、主題與文案都照協會調性設計，不是套版換色。" },
        { t: "名單資料自有", d: "加入與訂閱名單存在你自己的伺服器，可持續經營、不綁第三方。" },
        { t: "能一直長大", d: "今天是官網與招募，明天要加活動報名、會員系統都能疊加。" },
      ],
    },
    finalCta: {
      title: "想要一個完全屬於你的品牌官網？",
      desc: "從品牌視覺、動效體驗到表單轉換與名單經營，我們能照你的調性完全客製。也歡迎先造訪已上線的 GT Club 看實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 GT Club 網站 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · Brand Site × Community",
    title: "Help an idea find its people\nand go further together",
    lede: "A brand website and community platform we built from scratch for the Taiwan Good Together Association (GT Club): light/dark themes and smooth motion build trust, three topic hubs (AI / Web3 / sustainability) and a works showcase convey the mission, and a join form plus newsletter turn visitors into members — submitted, landed and notified instantly, with visit analytics in the back office. A live site already recruiting founding members.",
    ctaPrimary: "Build my brand site",
    ctaVisit: "Visit the GT Club site →",
    stats: [
      { n: "Light/Dark", l: "Theme switch × smooth motion" },
      { n: "3 hubs", l: "AI / Web3 / Sustainability" },
      { n: "One-tap join", l: "Submit → notify & land" },
      { n: "Founder count", l: "Recruiting progress, live" },
    ],
    conv: {
      label: "How it works",
      title: "From moved by the idea to ready to join",
      desc: "A community grows when the right people feel it's a fit and want in. We designed the whole experience as a conversion path: professional visuals and motion build trust, topics and results convey the mission, and joining or subscribing becomes one tap — zero burden for visitors, notified and landed leads for the association.",
      steps: [
        { t: "Immersive brand", d: "Light/dark themes, reveal motion and polished visuals earn trust at a glance" },
        { t: "Moved by the mission", d: "AI / Web3 / sustainability hubs and key results convey the energy" },
        { t: "Join in one tap", d: "Join form or newsletter — submitted lands and notifies the admin instantly" },
      ],
    },
    arch: {
      label: "Architecture",
      title: "From front-end experience to back-office leads",
      layers: [
        { t: "Brand front-end", d: "Hero, about, three hubs, works and activities with themes and motion", tag: "Experience" },
        { t: "Conversion", d: "Join form & newsletter: zod validation, honeypot anti-spam, rate limiting", tag: "Convert" },
        { t: "Back office & ops", d: "Leads written to a server file, instant email, visit analytics (IP/geo/bot)", tag: "Ops" },
      ],
    },
    feat: {
      label: "Features",
      title: "One site carrying brand and community",
      items: [
        { t: "Three topic hubs", d: "AI / Web3 / sustainability each with dedicated content and visuals." },
        { t: "Works showcase", d: "Key projects (incl. AI accounting, AI meeting integration) build credibility." },
        { t: "Activity photo wall", d: "Dynamic display of community activities for engagement and authenticity." },
        { t: "Join application form", d: "zod validation + honeypot + rate limit; submissions land to file and notify." },
        { t: "Newsletter", d: "Collect leads and nurture relationships — turn one visit into a lasting link." },
        { t: "Founder-count stats", d: "Live recruiting progress creating momentum to join in." },
        { t: "Light/dark & motion", d: "framer-motion reveal and theme switching for a modern brand feel." },
        { t: "Visit notify & analytics", d: "Every visit notified with IP, geo and bot detection — traffic and risk visibility." },
      ],
    },
    why: {
      label: "Why fully custom",
      title: "The brand is yours — the site should grow into exactly that",
      items: [
        { t: "Built for your brand", d: "Visuals, motion, topics and copy designed to your tone — not a recolored template." },
        { t: "You own the leads", d: "Join and newsletter lists live on your own server for ongoing nurture, no lock-in." },
        { t: "Grows with you", d: "Site and recruiting today; event sign-ups and a member system tomorrow." },
      ],
    },
    finalCta: {
      title: "Want a brand site that's entirely yours?",
      desc: "From brand visuals and motion to form conversion and lead nurture, we build to your tone. Feel free to visit the live GT Club to see the result.",
      btn: "Book a free consultation",
      visit: "Visit the GT Club site →",
    },
  },
} as const;

export default async function GtClubCase({
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

      {/* How it works — journey flow */}
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

      {/* Why custom */}
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
