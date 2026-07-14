import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const SITE_URL = "https://agent.damentec.com/";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "AG Agent 會議智能助手｜完全客製案例 · Avalo 阿瓦羅"
      : "AG Agent — Meeting Assistant｜Fully-Custom Case · Avalo",
    description: zh
      ? "每週自動擷取會議與研究、GPT 摘要結構化、向量檢索 RAG 問答的企業 AI 知識庫平台，完全客製、繁中英雙語。"
      : "An enterprise AI knowledge platform that auto-captures meetings and research, summarizes with GPT and answers via RAG — fully custom, bilingual.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · 企業 AI × 知識庫",
    title: "把散落的會議與研究，\n變成隨問隨答的知識",
    lede: "我們為客戶從零打造的企業 AI 週會助手：每週自動從 Google Drive 擷取週報、研究與會議影音，用 GPT 產出結構化重點、Perplexity 補上項目最新消息，全部向量化後可用自然語言問答。開完會不用再手動整理，重點自己長出來、隨時問得到——一個已上線、天天在用的內部系統。",
    ctaPrimary: "打造我公司的 AI 知識庫",
    ctaVisit: "造訪 AG Agent 網站 →",
    stats: [
      { n: "每週自動", l: "從 Google Drive 擷取彙整" },
      { n: "秒級摘要", l: "GPT 產出結構化重點" },
      { n: "語意檢索", l: "RAG 問歷史決議" },
      { n: "繁中／EN", l: "雙語 · Google 登入" },
    ],
    conv: {
      label: "怎麼運作",
      title: "開完會，重點自己長出來",
      desc: "會議與研究資料最怕「開完就沉底、要用時找不到」。我們把它變成一條自動管線：每週把 Google Drive 的週報與研究抓下來，AI 讀完產出結構化重點，再把最新消息補上，最後全部變成可以用一句話問到的知識。你要做的只剩下——問。",
      steps: [
        { t: "自動擷取", d: "每週從 Google Drive 抓週報、研究、會議影音" },
        { t: "AI 摘要結構化", d: "GPT 產出重點並提取作者／項目／週次；Perplexity 補最新消息" },
        { t: "隨問隨答", d: "全部向量化，浮動 Chatbot 用自然語言問歷史決議" },
      ],
    },
    arch: {
      label: "系統架構",
      title: "從資料來源到隨問隨答，一條龍",
      layers: [
        { t: "來源層", d: "Google Drive：週報、研究報告、會議影音、VC／鏈上策略資料", tag: "擷取" },
        { t: "處理層", d: "GPT 摘要結構化 ＋ Perplexity 查證最新消息 ＋ 向量化（Supabase）", tag: "AI 處理" },
        { t: "應用層", d: "Dashboard 跑馬燈、知識庫分類、RAG Chatbot、報表與權限", tag: "使用" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "一套系統，涵蓋擷取、理解到問答",
      items: [
        { t: "Google Drive 自動擷取", d: "每週自動下載週報、研究報告與會議影音，免人工搬運。" },
        { t: "GPT 摘要與結構化", d: "產出重點摘要，並提取作者、項目、週次等結構化欄位為 JSON。" },
        { t: "Perplexity 最新消息", d: "自動查詢每個項目的後續消息並附來源連結，不錯過關鍵進展。" },
        { t: "全文語意檢索（RAG）", d: "文件向量化存 Supabase，用自然語言就能問到歷史決議與研究。" },
        { t: "浮動 AI Chatbot", d: "任何頁面隨時提問，即時引用資料庫內容回答（VIP 權限）。" },
        { t: "知識庫分類瀏覽", d: "財經研究、VC 創投、鏈上策略聰明錢，分類篩選、點開看全文。" },
        { t: "Dashboard 儀表板", d: "最新更新跑馬燈、項目追蹤狀況、本週週報精華一頁看盡。" },
        { t: "報表與權限管理", d: "用戶管理、Google 登入、CSV／JSON 報表下載，管理員後台完整。" },
      ],
    },
    why: {
      label: "為什麼選完全客製",
      title: "你的知識流程獨一無二，工具就該為它而生",
      items: [
        { t: "照你的會議與知識流程打造", d: "資料來源、摘要欄位、分類方式都能依你的團隊運作方式設計。" },
        { t: "資料自有、可控", d: "文件與向量索引存在你自己的資料庫，不外流、可稽核。" },
        { t: "能一直長大", d: "今天接 Google Drive，明天要接更多資料源、更多 AI 能力都能疊加。" },
      ],
    },
    finalCta: {
      title: "想把你公司的知識，變成問得到的答案？",
      desc: "從資料自動擷取、AI 摘要到 RAG 問答，我們能照你的知識流程完全客製。也歡迎先造訪已上線的 AG Agent 看實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 AG Agent 網站 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · Enterprise AI × Knowledge Base",
    title: "Turn scattered meetings\ninto answers on demand",
    lede: "An enterprise AI meeting assistant we built from scratch: every week it auto-pulls reports, research and meeting recordings from Google Drive, produces structured highlights with GPT, adds the latest project news via Perplexity, and vectorizes everything for natural-language Q&A. No more manual note-wrangling — the highlights write themselves and stay askable. A live internal system, used every day.",
    ctaPrimary: "Build my company's AI knowledge base",
    ctaVisit: "Visit the AG Agent site →",
    stats: [
      { n: "Weekly auto", l: "Captured from Google Drive" },
      { n: "Instant summary", l: "GPT structured highlights" },
      { n: "Semantic search", l: "RAG over past decisions" },
      { n: "ZH / EN", l: "Bilingual · Google login" },
    ],
    conv: {
      label: "How it works",
      title: "After the meeting, the highlights write themselves",
      desc: "Meeting and research material tends to sink and vanish right when you need it. We turned it into an automatic pipeline: pull the week's reports and research from Google Drive, let AI read them into structured highlights, add the latest news, and turn it all into knowledge you can reach with a single question. All you have to do is ask.",
      steps: [
        { t: "Auto-capture", d: "Weekly pull of reports, research and recordings from Google Drive" },
        { t: "AI summarize", d: "GPT highlights + author/project/week fields; Perplexity adds latest news" },
        { t: "Ask anything", d: "All vectorized; a floating chatbot answers in natural language" },
      ],
    },
    arch: {
      label: "Architecture",
      title: "From source to on-demand answers, end-to-end",
      layers: [
        { t: "Source", d: "Google Drive: reports, research, recordings, VC / on-chain strategy data", tag: "Capture" },
        { t: "Processing", d: "GPT summarize + Perplexity fact-check + vectorize (Supabase)", tag: "AI" },
        { t: "Application", d: "Dashboard ticker, knowledge library, RAG chatbot, reports & roles", tag: "Use" },
      ],
    },
    feat: {
      label: "Features",
      title: "One system: capture, understand, answer",
      items: [
        { t: "Google Drive auto-capture", d: "Weekly download of reports, research and recordings — no manual moving." },
        { t: "GPT summary & structuring", d: "Highlight summaries plus author/project/week extracted into JSON." },
        { t: "Perplexity latest news", d: "Auto-checks each project's follow-up news with source links." },
        { t: "Semantic search (RAG)", d: "Docs vectorized in Supabase; ask past decisions in plain language." },
        { t: "Floating AI chatbot", d: "Ask from any page; answers cite the knowledge base (VIP)." },
        { t: "Knowledge library", d: "Financial research, VC and on-chain strategy — filter and read in full." },
        { t: "Dashboard", d: "Latest-update ticker, project tracking and this week's report digest." },
        { t: "Reports & roles", d: "User management, Google login, CSV/JSON export, full admin panel." },
      ],
    },
    why: {
      label: "Why fully custom",
      title: "Your knowledge flow is unique — the tool should be too",
      items: [
        { t: "Built to your flow", d: "Data sources, summary fields and categories designed around how your team works." },
        { t: "Own, auditable data", d: "Documents and vector index live in your own database — private, auditable." },
        { t: "Grows with you", d: "Google Drive today; more sources and more AI capabilities tomorrow." },
      ],
    },
    finalCta: {
      title: "Want your company's knowledge to become answers on demand?",
      desc: "From auto-capture and AI summaries to RAG Q&A, we build to your knowledge flow. Feel free to visit the live AG Agent to see the result.",
      btn: "Book a free consultation",
      visit: "Visit the AG Agent site →",
    },
  },
} as const;

export default async function AgAgentCase({
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

      {/* How it works — pipeline flow */}
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
