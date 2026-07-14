import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "企業財務自動化系統｜完全客製案例 · Avalo 阿瓦羅"
      : "Finance Automation System｜Fully-Custom Case · Avalo",
    description: zh
      ? "Telegram 拍照即入帳、後台整合折舊／外匯／月結關帳與財報，完全客製、可治理可稽核的企業會計系統。"
      : "Snap a receipt on Telegram and it's booked; back office handles depreciation, FX, month-end close and financial statements — a fully custom, governable accounting system.",
  };
}

// 頁面文案（自成一格的中英對照，不塞進全站 messages）
const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "完全客製案例 · AI × 財務治理",
    title: "把繁瑣記帳，變成\n可治理的流程",
    lede: "我們為企業從零打造的財務自動化系統：前線同仁用 Telegram 拍照上傳憑證即自動入帳，後台整合固定資產折舊、外匯遞推、月結關帳與財務報表——全流程可追溯、可稽核、可穩定月結。這不是套版工具，是照著客戶實際作業流程長出來的系統。",
    ctaPrimary: "聊聊我的流程能怎麼自動化",
    ctaGhost: "看其他案例",
    stats: [
      { n: "< 30 秒", l: "拍照上傳到完成入帳（示意）" },
      { n: "3 層", l: "輸入 → 管理 → 產出 一條龍" },
      { n: "1 鍵", l: "損益表／資產負債表匯出" },
      { n: "100%", l: "關鍵操作留稽核軌跡" },
    ],
    conv: {
      label: "方便性",
      title: "隨時隨地，拍張照就入帳",
      desc: "報帳最大的痛，是前線人員要回到電腦、開系統、一欄一欄填。我們把入口搬到人人都有的 Telegram：拍照、丟給機器人，AI 自動讀出金額與品項、產生報銷事由，直接寫進帳。前線零負擔，財務端拿到的是已結構化的資料。",
      steps: [
        { t: "拍照上傳", d: "在 Telegram 傳一張收據照片或 PDF" },
        { t: "AI 抽取", d: "自動辨識金額、日期、品項，補上報銷事由" },
        { t: "自動入帳", d: "寫入交易與附件，財務端即時可見" },
      ],
    },
    arch: {
      label: "系統架構",
      title: "一條龍：從前線填報到財報產出",
      layers: [
        { t: "輸入層 · 前線", d: "Telegram 建立收入／支出、上傳憑證", tag: "同仁" },
        { t: "管理層 · 財務", d: "交易維護、固定資產、調撥、外匯、月結鎖定", tag: "後台" },
        { t: "產出層 · 報表", d: "損益表、資產負債表、憑證簽核單（Excel／PDF）", tag: "對外" },
      ],
    },
    feat: {
      label: "功能特色",
      title: "一套系統，涵蓋整個財務作業",
      items: [
        { t: "Telegram 快速填報", d: "拍照上傳憑證即入帳，支援 JPG／PNG／PDF；也能在 TG 端查詢、刪除紀錄。" },
        { t: "AI 憑證抽取", d: "自動讀出憑證資料、生成報銷事由；AI 暫時不可用時自動降級，不擋入帳。" },
        { t: "固定資產折舊", d: "依台帳於已鎖定月份自動提列，折舊與紀錄同一筆交易寫入，避免部分入帳。" },
        { t: "外匯遞推引擎", d: "加權平均遞推計算兌換損益，官方匯率以央行月資料優先、日資料備援。" },
        { t: "月結關帳與內控", d: "鎖定後禁止該月一般交易／調撥／外匯再寫入；解鎖須填原因，全程留痕。" },
        { t: "財務報表輸出", d: "一鍵匯出損益表、資產負債表與簽核單，Excel／PDF 格式一致化。" },
        { t: "薪資與代墊結算", d: "彙總代墊現金支出、支援薪資批次發放與取消（自動建立反向分錄）。" },
        { t: "稽核軌跡", d: "關鍵操作保留操作人、時間與行為紀錄，內控透明、可追溯。" },
      ],
    },
    time: {
      label: "省時省力",
      title: "把時間還給真正重要的事",
      desc: "零散憑證、反覆對帳、月底趕報表——這些例行負擔被系統吸收後，團隊能把精力放回本業。下圖為典型作業的相對工時示意（實際依單量與規模而定）。",
      rows: [
        { t: "憑證登打", manual: 100, auto: 15 },
        { t: "月結關帳", manual: 100, auto: 30 },
        { t: "報表產出", manual: 100, auto: 8 },
      ],
      manualLabel: "人工作業",
      autoLabel: "系統化後",
      note: "※ 相對工時示意圖，非實測數據；實際成效依作業量、流程複雜度而定。",
    },
    gov: {
      label: "治理與內控",
      title: "不只是記帳，是可被信任的財務流程",
      items: [
        "月結鎖定後，一般交易、調撥、外匯流水皆無法再寫入該月，杜絕無痕改帳",
        "解鎖需填寫原因，關鍵操作全程保留 audit log",
        "折舊為系統分錄，與執行紀錄在同一資料庫交易內完成，資料一致",
        "資金以留存位置為唯一維度，金流分層清楚、可追溯",
      ],
    },
    why: {
      label: "為什麼選完全客製",
      title: "套版做不到的，我們照你的流程長出來",
      items: [
        { t: "貼合你的實際流程", d: "系統照著你既有的作業方式設計，而不是逼你遷就工具。" },
        { t: "沒有月租綁定", d: "自建自有、資料在你手上，不必為每個功能付永久 SaaS 月費。" },
        { t: "能一直長大", d: "今天是記帳，明天要接 POS、ERP、報稅，都能在同一套系統上疊加。" },
      ],
    },
    finalCta: {
      title: "你的哪個流程，最該被自動化？",
      desc: "從記帳、請款、出貨到報表，只要是重複、耗時、容易出錯的環節，我們都能為你量身打造。免費諮詢，先聊聊再報價。",
      btn: "預約免費諮詢",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Fully-Custom Case · AI × Financial Governance",
    title: "Turn tedious bookkeeping\ninto a governable process",
    lede: "A finance automation system we built from scratch: front-line staff snap a photo of a receipt on Telegram and it's booked automatically, while the back office handles fixed-asset depreciation, FX, month-end close and financial statements — fully traceable, auditable and reliably closeable. Not a template; a system grown around the client's real process.",
    ctaPrimary: "Talk about automating my process",
    ctaGhost: "See other cases",
    stats: [
      { n: "< 30s", l: "Photo upload to booked (illustrative)" },
      { n: "3 layers", l: "Input → Manage → Output, end-to-end" },
      { n: "1 click", l: "P&L / balance-sheet export" },
      { n: "100%", l: "Key actions leave an audit trail" },
    ],
    conv: {
      label: "Convenience",
      title: "Book an expense anywhere, just take a photo",
      desc: "The biggest pain in expense reporting is making staff go back to a computer and fill fields one by one. We moved the entry point to Telegram: take a photo, send it to the bot, and AI reads the amount and items, drafts the memo, and writes it straight to the books. Zero burden up front; structured data for finance.",
      steps: [
        { t: "Snap & send", d: "Send a receipt photo or PDF on Telegram" },
        { t: "AI extracts", d: "Auto-reads amount, date, items; drafts the memo" },
        { t: "Auto-booked", d: "Written to transactions and attachments, visible instantly" },
      ],
    },
    arch: {
      label: "Architecture",
      title: "End-to-end: from field entry to statements",
      layers: [
        { t: "Input · Field", d: "Create income/expense and upload receipts on Telegram", tag: "Staff" },
        { t: "Manage · Finance", d: "Transactions, fixed assets, transfers, FX, month-end lock", tag: "Back office" },
        { t: "Output · Reports", d: "P&L, balance sheet, approval vouchers (Excel/PDF)", tag: "External" },
      ],
    },
    feat: {
      label: "Features",
      title: "One system, the whole finance workflow",
      items: [
        { t: "Telegram fast entry", d: "Photo-to-booking for receipts; JPG/PNG/PDF; query and delete from Telegram too." },
        { t: "AI receipt extraction", d: "Auto-reads receipt data and drafts memos; degrades gracefully if AI is down." },
        { t: "Fixed-asset depreciation", d: "Auto-posted for locked months as a system entry, written atomically with its run record." },
        { t: "FX engine", d: "Weighted-average FX gain/loss; central-bank monthly rates first, daily as fallback." },
        { t: "Month-end close & controls", d: "Once locked, no more transactions/transfers/FX for that month; unlock needs a reason, all logged." },
        { t: "Financial statements", d: "One-click P&L, balance sheet and approval vouchers in consistent Excel/PDF." },
        { t: "Payroll & reimbursements", d: "Aggregates advanced cash, batch payroll with reversible entries." },
        { t: "Audit trail", d: "Key actions keep operator, time and action records — transparent, traceable controls." },
      ],
    },
    time: {
      label: "Time saved",
      title: "Give time back to what matters",
      desc: "Scattered receipts, endless reconciliation, month-end report crunch — once the system absorbs these, the team refocuses on the core business. Below is an illustrative relative-effort comparison for typical tasks (actuals depend on volume and scale).",
      rows: [
        { t: "Receipt entry", manual: 100, auto: 15 },
        { t: "Month-end close", manual: 100, auto: 30 },
        { t: "Report output", manual: 100, auto: 8 },
      ],
      manualLabel: "Manual",
      autoLabel: "With system",
      note: "※ Illustrative relative effort, not measured data; real results depend on volume and complexity.",
    },
    gov: {
      label: "Governance",
      title: "Not just bookkeeping — a finance process you can trust",
      items: [
        "Once a month is locked, no transactions/transfers/FX can be written to it — no silent edits",
        "Unlocking requires a reason; key actions keep a full audit log",
        "Depreciation is a system entry written atomically with its run record",
        "Funds tracked by a single retention dimension — clear, traceable flows",
      ],
    },
    why: {
      label: "Why fully custom",
      title: "What templates can't do, grown around your process",
      items: [
        { t: "Fits your real process", d: "Designed around how you already work, instead of forcing you into a tool." },
        { t: "No monthly lock-in", d: "You own it, your data stays with you — no perpetual SaaS fee per feature." },
        { t: "Grows with you", d: "Bookkeeping today; POS, ERP and tax filing tomorrow — all on one system." },
      ],
    },
    finalCta: {
      title: "Which of your processes should be automated first?",
      desc: "Bookkeeping, billing, shipping, reporting — anything repetitive, time-consuming or error-prone, we can build to fit. Free consultation, we talk before we quote.",
      btn: "Book a free consultation",
    },
  },
} as const;

export default async function FinanceAutomationCase({
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
          <Link href={{ pathname: "/", hash: "cases" }} className="btn-ghost">{c.ctaGhost}</Link>
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

      {/* Convenience — Telegram flow */}
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

      {/* Time saved chart */}
      <section className="fa-section">
        <div className="mono-label">{c.time.label}</div>
        <h2 className="fa-h2">{c.time.title}</h2>
        <p className="fa-p">{c.time.desc}</p>
        <div className="fa-chart">
          <div className="fa-chart-legend">
            <span><i className="fa-swatch fa-swatch-manual" />{c.time.manualLabel}</span>
            <span><i className="fa-swatch fa-swatch-auto" />{c.time.autoLabel}</span>
          </div>
          {c.time.rows.map((r) => (
            <div className="fa-bar-row" key={r.t}>
              <div className="fa-bar-label">{r.t}</div>
              <div className="fa-bars">
                <div className="fa-bar fa-bar-manual" style={{ width: `${r.manual}%` }}>
                  <span>{r.manual}</span>
                </div>
                <div className="fa-bar fa-bar-auto" style={{ width: `${r.auto}%` }}>
                  <span>{r.auto}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="fa-chart-note">{c.time.note}</div>
        </div>
      </section>

      {/* Governance */}
      <section className="fa-section">
        <div className="mono-label">{c.gov.label}</div>
        <h2 className="fa-h2">{c.gov.title}</h2>
        <div className="fa-gov">
          {c.gov.items.map((g) => (
            <div className="fa-gov-item" key={g}>{g}</div>
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
        <Link href={{ pathname: "/", hash: "contact" }} className="btn-primary">{c.finalCta.btn}</Link>
      </section>
    </main>
  );
}
