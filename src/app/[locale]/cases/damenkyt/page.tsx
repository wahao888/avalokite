import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://damenkyt.com/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "Damen KYT 反詐騙平台｜完全客製案例 · Avalo 阿瓦羅"
      : "Damen KYT Anti-Fraud Platform｜Fully-Custom Case · Avalo",
    description: zh
      ? "輸入錢包地址即時算出風險評分、5 步驟線上報案自動產 PDF 的加密貨幣反詐騙／KYT 平台，完全客製、繁中英雙語。"
      : "A crypto anti-fraud / KYT platform: instant wallet risk scoring and a 5-step online report with auto PDF — fully custom, bilingual.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · 區塊鏈安全 × 反詐騙",
    title: "把鏈上風險，變成\n看得懂的分數",
    lede: "我們為客戶從零打造的加密貨幣反詐騙／KYT 平台：輸入錢包地址即時算出風險評分、5 步驟線上報案自動產出專業 PDF，搭配黑白名單、區塊鏈學院與繁中英雙語——一個已上線、真實在服務用戶的完整產品。",
    ctaPrimary: "打造我自己的風控平台",
    ctaVisit: "造訪 DamenKYT 網站 →",
    stats: [
      { n: "0–100", l: "錢包風險評分即時算出" },
      { n: "四級", l: "低／中／高／極高 風險等級" },
      { n: "5 步驟", l: "線上報案，自動產 PDF" },
      { n: "繁中／EN", l: "雙語上線、SEO 完整" },
    ],
    conv: {
      label: "核心功能",
      title: "貼上錢包地址，即時看風險",
      desc: "面對一個陌生的加密錢包，最需要的是「這個地址乾不乾淨」。我們把它變成一次查詢：貼上以太坊地址，系統掃描交易、比對黑名單、計算異常比例，幾秒內回一個 0–100 的風險分數與等級，讓你先驗過風險再決定往來。",
      steps: [
        { t: "貼上地址", d: "輸入要查詢的以太坊錢包地址" },
        { t: "分析比對", d: "掃描交易、比對黑名單、計算異常交易比例" },
        { t: "風險評分", d: "回傳 0–100 分、風險等級與交易統計" },
      ],
    },
    score: {
      label: "風險評分機制",
      title: "分數怎麼來的，透明可解釋",
      items: [
        "比對已知的黑名單與可疑地址",
        "計算異常交易比例與往來對象",
        "彙整交易統計、活躍度與資金流向",
        "綜合為 0–100 分，分四級：低／中／高／極高",
      ],
    },
    report: {
      label: "線上報案系統",
      title: "被詐騙了？5 步驟完成報案，自動產出報告",
      steps: [
        { t: "基本資訊", d: "姓名、Email、國家與城市", tag: "STEP 1" },
        { t: "案件詳情", d: "詐騙類型、損失金額、幣種、詐騙錢包地址", tag: "STEP 2" },
        { t: "證據上傳", d: "JPG／PNG／PDF／DOCX，最多 10 個檔案", tag: "STEP 3" },
        { t: "確認提交", d: "預覽所有資訊、勾選隱私政策同意", tag: "STEP 4" },
        { t: "生成報告", d: "自動產出案件編號與專業 PDF，可後續追蹤", tag: "STEP 5" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "一個平台，涵蓋查詢、報案到教育",
      items: [
        { t: "錢包風險查詢", d: "以太坊地址即時查詢，回傳風險與交易統計，無需註冊即可試用。" },
        { t: "風險評分引擎", d: "黑名單比對＋異常交易分析，綜合為 0–100 分與四級風險等級。" },
        { t: "線上報案系統", d: "5 步驟表單、證據上傳、必填驗證，提交成功率經驗收 > 95%。" },
        { t: "PDF 專業報告", d: "自動生成含案件編號的正式報案文件，可下載、可追蹤。" },
        { t: "黑白名單管理", d: "後台維護可疑／可信地址，查詢與報案即時比對。" },
        { t: "區塊鏈學院", d: "文章與影片內容管理（Markdown 編輯、搜尋），建立安全教育資源。" },
        { t: "多語系國際化", d: "繁體中文／English 即時切換，服務跨國用戶。" },
        { t: "SEO 與內容後台", d: "動態 meta、Open Graph、可視化後台，讓內容被搜尋得到。" },
      ],
    },
    why: {
      label: "為什麼選完全客製",
      title: "風控邏輯是你的核心，不該遷就套版",
      items: [
        { t: "照你的風控政策打造", d: "評分規則、名單來源、報案欄位都能依你的合規需求量身設計。" },
        { t: "資料自有、可稽核", d: "查詢與案件紀錄留在你手上，符合合規與內控要求。" },
        { t: "能一直長大", d: "今天是以太坊，明天要接更多鏈、更多資料源與對外 API，都能疊加。" },
      ],
    },
    finalCta: {
      title: "想打造你自己的風控／反詐騙平台？",
      desc: "從錢包風險查詢、KYT 評分到線上報案，我們能照你的風控政策完全客製。也歡迎先造訪已上線的 DamenKYT 看實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 DamenKYT 網站 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · Blockchain Security × Anti-Fraud",
    title: "Turn on-chain risk into\na score you can read",
    lede: "A crypto anti-fraud / KYT platform we built from scratch: paste a wallet address for an instant risk score, file a report in 5 steps with an auto-generated professional PDF, plus blacklist/whitelist, a blockchain academy and full bilingual support — a live product already serving real users.",
    ctaPrimary: "Build my own risk platform",
    ctaVisit: "Visit the DamenKYT site →",
    stats: [
      { n: "0–100", l: "Instant wallet risk score" },
      { n: "4 tiers", l: "Low / Medium / High / Critical" },
      { n: "5 steps", l: "Online report, auto PDF" },
      { n: "ZH / EN", l: "Bilingual, full SEO" },
    ],
    conv: {
      label: "Core feature",
      title: "Paste a wallet address, see the risk instantly",
      desc: "Facing an unknown crypto wallet, what you need to know is whether it's clean. We turned that into a single query: paste an Ethereum address, the system scans transactions, checks blacklists and computes anomaly ratios, and returns a 0–100 risk score and tier in seconds — so you screen risk before you engage.",
      steps: [
        { t: "Paste address", d: "Enter the Ethereum wallet address to check" },
        { t: "Analyze & match", d: "Scan transactions, check blacklists, compute anomaly ratio" },
        { t: "Risk score", d: "Return a 0–100 score, risk tier and transaction stats" },
      ],
    },
    score: {
      label: "How the score works",
      title: "Transparent and explainable scoring",
      items: [
        "Matches known blacklists and suspicious addresses",
        "Computes anomaly ratios and counterparties",
        "Aggregates transaction stats, activity and fund flows",
        "Combined into 0–100, four tiers: Low / Medium / High / Critical",
      ],
    },
    report: {
      label: "Online reporting",
      title: "Scammed? File a report in 5 steps, PDF auto-generated",
      steps: [
        { t: "Basic info", d: "Name, email, country and city", tag: "STEP 1" },
        { t: "Case details", d: "Scam type, loss amount, coin, scammer wallet address", tag: "STEP 2" },
        { t: "Evidence", d: "JPG/PNG/PDF/DOCX, up to 10 files", tag: "STEP 3" },
        { t: "Confirm", d: "Preview everything, agree to privacy policy", tag: "STEP 4" },
        { t: "Report", d: "Auto case number and professional PDF, with tracking", tag: "STEP 5" },
      ],
    },
    feat: {
      label: "Features",
      title: "One platform: lookup, reporting and education",
      items: [
        { t: "Wallet risk lookup", d: "Instant Ethereum address checks with risk and transaction stats — try without signing up." },
        { t: "Risk-scoring engine", d: "Blacklist matching + anomaly analysis combined into 0–100 and four tiers." },
        { t: "Online reporting", d: "5-step form, evidence upload, required-field validation; >95% submission success at acceptance." },
        { t: "PDF reports", d: "Auto-generated official report with a case number — downloadable and trackable." },
        { t: "Blacklist / whitelist", d: "Maintain suspicious/trusted addresses; lookups and reports match in real time." },
        { t: "Blockchain academy", d: "Article & video CMS (Markdown editing, search) for security education." },
        { t: "Bilingual i18n", d: "Instant Traditional Chinese / English switching for global users." },
        { t: "SEO & content admin", d: "Dynamic meta, Open Graph and a visual admin so content gets found." },
      ],
    },
    why: {
      label: "Why fully custom",
      title: "Your risk logic is the core — don't settle for a template",
      items: [
        { t: "Built to your risk policy", d: "Scoring rules, list sources and report fields all tailored to your compliance needs." },
        { t: "Own, auditable data", d: "Lookups and case records stay with you, meeting compliance and control needs." },
        { t: "Grows with you", d: "Ethereum today; more chains, data sources and outward APIs tomorrow." },
      ],
    },
    finalCta: {
      title: "Want your own risk / anti-fraud platform?",
      desc: "From wallet risk lookups and KYT scoring to online reporting, we build to your risk policy. Feel free to visit the live DamenKYT to see the real result.",
      btn: "Book a free consultation",
      visit: "Visit the DamenKYT site →",
    },
  },
} as const;

export default async function DamenKytCase({
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

      {/* Wallet risk lookup flow */}
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

      {/* Scoring mechanism */}
      <section className="fa-section">
        <div className="mono-label">{c.score.label}</div>
        <h2 className="fa-h2">{c.score.title}</h2>
        <div className="fa-gov">
          {c.score.items.map((g) => (
            <div className="fa-gov-item" key={g}>{g}</div>
          ))}
        </div>
      </section>

      {/* 5-step report flow */}
      <section className="fa-section">
        <div className="mono-label">{c.report.label}</div>
        <h2 className="fa-h2">{c.report.title}</h2>
        <div className="fa-arch">
          {c.report.steps.map((l, i) => (
            <div className="fa-arch-row" key={l.t}>
              <div className="fa-arch-tag">{l.tag}</div>
              <div className="fa-arch-card">
                <div className="fa-arch-t">{l.t}</div>
                <div className="fa-arch-d">{l.d}</div>
              </div>
              {i < c.report.steps.length - 1 && <div className="fa-arch-down">↓</div>}
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
