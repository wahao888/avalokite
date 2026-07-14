import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://jeantogo.com/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "JeanToGo｜Uber Eats 上架獲客平台 · 完全客製案例 · Avalo 阿瓦羅"
      : "JeanToGo｜Uber Eats Lead-Gen Platform · Fully-Custom Case · Avalo",
    description: zh
      ? "SEO 內容與城市方案落地頁帶進搜尋詢問、線上表單一鍵諮詢、後台 CRM 追蹤每筆商機的 Uber Eats 上架獲客平台，完全客製。"
      : "A fully-custom Uber Eats onboarding lead-gen platform: SEO landing pages, an online enquiry form and a back-office CRM tracking every lead.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · 行銷獲客 × 商家上架",
    title: "把「想上外送」的店家，\n一路帶到開賣",
    lede: "我們為客戶從零打造的 Uber Eats 上架獲客平台：用 SEO 內容與各縣市方案落地頁，接住正在搜尋「Uber Eats 申請」的餐飲店家，再用一鍵線上表單把他們變成商機，後台 CRM 讓顧問逐筆追蹤、從文件到開賣全程代辦。獲客、轉換、成交在同一套系統裡跑——一個已上線、天天在帶客的平台。",
    ctaPrimary: "打造我的獲客平台",
    ctaVisit: "造訪 JeanToGo 網站 →",
    stats: [
      { n: "全台", l: "各縣市專屬方案落地頁" },
      { n: "SEO 自然搜尋", l: "帶進高意圖詢問" },
      { n: "一鍵表單", l: "零門檻線上諮詢" },
      { n: "後台 CRM", l: "每筆詢問都追蹤" },
    ],
    conv: {
      label: "怎麼運作",
      title: "店家從搜尋找到你，顧問帶他到開賣",
      desc: "多數餐飲店主不懂外送平台後台，卡在「不知道怎麼申請、要準備什麼」。我們把整段旅程做成一條龍：讓他在搜尋時就找到你、用最簡單的方式留下資料，再由顧問一路帶到成功上架——店家零負擔，你這端拿到的是已經追蹤好的商機。",
      steps: [
        { t: "從搜尋找到你", d: "店家搜「Uber Eats 申請」，看到你的城市方案頁" },
        { t: "一鍵線上諮詢", d: "填簡單表單或 LINE，不用懂技術即可留資料" },
        { t: "顧問全程代辦", d: "文件、上架、驗證到撥款，專人帶到開賣" },
      ],
    },
    arch: {
      label: "獲客漏斗",
      title: "曝光、轉換到成交，都在同一套系統",
      layers: [
        { t: "曝光層", d: "SEO 內容與各縣市方案落地頁，搜尋高意圖關鍵字就找得到", tag: "曝光" },
        { t: "轉換層", d: "線上諮詢表單、LINE、浮動客服鈕，一鍵就能留下資料", tag: "轉換" },
        { t: "成交與經營層", d: "後台 CRM 分狀態追蹤每筆詢問，顧問代辦到開賣、不漏接", tag: "成交" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "從帶客、轉換到代辦，一站到位",
      items: [
        { t: "SEO 內容行銷", d: "針對「Uber Eats 申請」等高意圖關鍵字佈局，自然搜尋帶客不燒廣告費。" },
        { t: "城市方案落地頁", d: "各縣市專屬頁面，在地關鍵字也搜得到，覆蓋全台商機。" },
        { t: "線上諮詢表單", d: "店家一鍵留資料或 LINE 諮詢，零技術門檻、提高轉換。" },
        { t: "後台 CRM 追蹤", d: "每筆詢問可分狀態管理、指派顧問，商機不漏接、可回訪。" },
        { t: "上架流程指南", d: "文件清單、審核時間、常見補件原因一次講清楚，減少來回。" },
        { t: "POS／平板教學", d: "Sunmi 機台設定與後台驗證步驟，圖文教學讓店家自己也會。" },
        { t: "撥款時程與食品登錄", d: "撥款時程、食品登錄注意事項整理成頁，降低客服負擔。" },
        { t: "見證、FAQ 與價目", d: "見證、常見問題與價目表等信任元素完整，臨門一腳更好成交。" },
      ],
    },
    why: {
      label: "為什麼選完全客製",
      title: "獲客流程是你的資產，不該租在別人的工具上",
      items: [
        { t: "為你的獲客流程打造", d: "落地頁、表單欄位、CRM 狀態都能依你的銷售方式量身設計。" },
        { t: "名單資料自有", d: "詢問名單存在你自己的後台，可持續回訪經營，不綁第三方。" },
        { t: "能一直長大", d: "今天做 Uber Eats，明天要加更多城市頁、更多服務品項都能疊加。" },
      ],
    },
    finalCta: {
      title: "想要一套自己的獲客系統嗎？",
      desc: "從 SEO 帶客、線上表單到後台 CRM，我們能照你的銷售流程完全客製。也歡迎先造訪已上線的 JeanToGo 看實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 JeanToGo 網站 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · Lead-Gen × Merchant Onboarding",
    title: "Take owners who \"want\nin on delivery\" all the way live",
    lede: "A fully-custom Uber Eats onboarding lead-gen platform we built from scratch: SEO content and per-city landing pages catch restaurant owners searching to apply, a one-tap online form turns them into leads, and a back-office CRM lets advisors track each one and handle everything from paperwork to going live. Acquisition, conversion and closing in one system — a live platform bringing in leads every day.",
    ctaPrimary: "Build my lead-gen platform",
    ctaVisit: "Visit the JeanToGo site →",
    stats: [
      { n: "Nationwide", l: "Per-city landing pages" },
      { n: "Organic SEO", l: "High-intent enquiries" },
      { n: "One-tap form", l: "Frictionless enquiry" },
      { n: "Back-office CRM", l: "Every lead tracked" },
    ],
    conv: {
      label: "How it works",
      title: "Owners find you via search; advisors take them live",
      desc: "Most restaurant owners don't know the delivery back office and get stuck on how to apply and what to prepare. We turned the whole journey into a pipeline: they find you in search, leave their details the easy way, and an advisor takes them through to a successful launch — zero burden for them, tracked leads for you.",
      steps: [
        { t: "Found via search", d: "Owners search \"Uber Eats apply\" and land on your city page" },
        { t: "One-tap enquiry", d: "A simple form or LINE — no tech needed to leave details" },
        { t: "Advisor handles it", d: "Paperwork, listing, verification and payout — taken all the way live" },
      ],
    },
    arch: {
      label: "Acquisition funnel",
      title: "Reach, convert and close — one system",
      layers: [
        { t: "Reach", d: "SEO content and per-city landing pages found on high-intent searches", tag: "Reach" },
        { t: "Convert", d: "Online enquiry form, LINE and a floating service button — one tap to submit", tag: "Convert" },
        { t: "Close & nurture", d: "Back-office CRM tracks each lead by status; advisors take it live, none dropped", tag: "Close" },
      ],
    },
    feat: {
      label: "Features",
      title: "Acquire, convert and onboard — end to end",
      items: [
        { t: "SEO content marketing", d: "Targets high-intent terms like \"Uber Eats apply\" — organic leads without ad spend." },
        { t: "Per-city landing pages", d: "Dedicated pages per city rank on local terms, covering the whole country." },
        { t: "Online enquiry form", d: "One-tap form or LINE — zero tech barrier, higher conversion." },
        { t: "Back-office CRM", d: "Track each enquiry by status and assign advisors — no lead dropped." },
        { t: "Application guide", d: "Document checklist, review times and common resubmission reasons, all upfront." },
        { t: "POS / tablet tutorials", d: "Sunmi setup and back-office verification, illustrated so owners can self-serve." },
        { t: "Payout & food registration", d: "Payout schedule and food-registration notes as pages — less support load." },
        { t: "Testimonials, FAQ, pricing", d: "Full trust elements — testimonials, FAQ and pricing to close the deal." },
      ],
    },
    why: {
      label: "Why fully custom",
      title: "Your acquisition flow is an asset — don't rent it on someone's tool",
      items: [
        { t: "Built to your funnel", d: "Landing pages, form fields and CRM statuses tailored to how you sell." },
        { t: "You own the leads", d: "Enquiries live in your own back office for ongoing nurture — no lock-in." },
        { t: "Grows with you", d: "Uber Eats today; more cities and service lines tomorrow, all stackable." },
      ],
    },
    finalCta: {
      title: "Want a lead-gen system of your own?",
      desc: "From SEO acquisition and online forms to a back-office CRM, we build to your sales flow. Feel free to visit the live JeanToGo to see the result.",
      btn: "Book a free consultation",
      visit: "Visit the JeanToGo site →",
    },
  },
} as const;

export default async function JeanToGoCase({
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

      {/* Funnel architecture */}
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
