import { setRequestLocale } from "next-intl/server";
import { caseMeta } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import LineCta from "@/components/LineCta";
import type { Locale } from "@/i18n/routing";

/**
 * 我們自己的 AI 客服案例。
 *
 * 這一頁刻意放真實數字，包括做壞過的兩件事。理由很實際：每一家都說自己的
 * AI 客服「準確、安全、好用」，沒有人給得出每段對話的成本、快取命中率，
 * 或是上線第一天報錯價的那一次。給得出來的那一家，不用形容詞就贏了。
 *
 * 數字來源是正式站 prod.db 的實測（2026-11），不是估的。改數字之前請先
 * 重新量一次：報告裡的數字一旦失真，這一頁的全部價值就沒了。
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return caseMeta(
    locale,
    "/cases/avalo-ai-support",
    {
      title: "我們自己用 AI 客服接線：每段對話 NT$0.011｜Avalo 阿瓦羅",
      description:
        "Avalo 官網與 LINE 官方帳號的客服就是我們賣的那一套。公開實測數字：每則回覆 US$0.000116、快取命中 88.8%、轉人通知與 AI 靜音怎麼設計，以及上線第一天報錯價的那一次。",
    },
    {
      title: "We run our own AI support: NT$0.011 per conversation｜Avalo",
      description:
        "The AI support on Avalo's site and LINE account is the product we sell. Real numbers: US$0.000116 per reply, 88.8% cache hit rate, how handoff works, and the day it quoted the wrong total.",
    },
  );
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "自家案例 · AI 智能客服",
    title: "我們自己的客服，\n就是我們賣的那一套",
    lede: "這個網站右下角的聊天視窗，和 LINE 官方帳號 @958nplck，背後是同一套系統。不是 demo、不是錄影——你現在就可以問它價格，然後回來看它花了我們多少錢。",
    ctaPrimary: "看三階方案 →",
    ctaLine: "到 LINE 上試一次",
    stats: [
      { n: "NT$0.011", l: "每段對話的模型成本" },
      { n: "88.8%", l: "知識庫前綴快取命中" },
      { n: "81", l: "每則回覆平均輸出 token" },
      { n: "0 次", l: "上線至今的未授權存取" },
    ],
    costLabel: "成本實測",
    costTitle: "一段對話，大約一分錢",
    costLede:
      "下面是正式站資料庫裡記錄的真實 token 數（2026 年 11 月），不是估算。模型是 gpt-6-luna，知識庫從價目表當場組出來，長度約 3,700 token。",
    costRows: [
      ["每則回覆平均輸入", "3,763 token（其中 3,342 命中快取）"],
      ["每則回覆平均輸出", "81 token"],
      ["每則回覆成本", "US$0.000116"],
      ["一段三問三答的對話", "約 US$0.00035 ≒ NT$0.011"],
      ["每月 5,000 組對話", "約 NT$56"],
    ],
    costNote:
      "所以我們不用對話則數跟你計費——那個數字小到不值得做一套計費系統。方案分級分的是知識庫規模、通道數與要不要接你的系統，不是 token。",
    builtLabel: "怎麼做到的",
    builtTitle: "便宜是設計出來的，不是運氣",
    built: [
      {
        t: "知識庫當成固定前綴",
        d: "每次對話的第一則訊息都是同一份知識庫，內容穩定才吃得到 prompt caching。命中的部分單價只有十分之一——88.8% 這個數字就是帳單差一個量級的原因。",
      },
      {
        t: "價格由程式帶入，不讓模型記",
        d: "知識庫是從價目表當場組出來的，不是手抄一份。調價之後客服立刻改口，沒有人需要記得去更新它。",
      },
      {
        t: "回覆限長，推理關掉",
        d: "每則控制在 150 字內，LINE 上沒有人想讀長篇；輸出 token 少，成本與等待時間一起降。",
      },
    ],
    wrongLabel: "我們做壞過的事",
    wrongTitle: "兩個上線後才發現的洞",
    wrongLede:
      "這兩件都是在正式站上被真實對話抓到的，修法已經變成所有客戶的預設設定。",
    wrong: [
      {
        t: "它自己把金額加起來，而且加錯了",
        d: "客人問「第一年總共多少」，AI 回了一個含稅 NT$169,930——正確是 168,924。多步運算模型會錯，而錯的報價客人會當成承諾。現在價格只能照抄，任何加總一律導向購物車試算。",
      },
      {
        t: "客人留了電話，卻沒有人收到通知",
        d: "原本只有第一次判定要轉人時寄信。客人接著補上姓名和電話，那封最有價值的訊息反而沒有通知任何人。現在轉接之後客人說的每一句都會寄，主旨還會標示「含聯絡方式」。",
      },
    ],
    humanLabel: "交給真人之後",
    humanTitle: "AI 要懂得閉嘴",
    humanLede:
      "判定要轉人之後，那段 LINE 對話的 AI 會安靜 12 小時：客人的訊息照樣存檔、照樣寄信給你，但不會在你打字的時候跟你搶話。時間到自動恢復——客人過幾天來問別的事，不該還是沒人理。",
    stack: ["Next.js", "LINE Messaging API", "OpenAI", "SQLite", "prompt caching"],
    foot: "想先看它怎麼回答？這一頁右下角就是。問它一個刁鑽的問題，看它什麼時候說「我不確定，請留下聯絡方式」。",
  },
  en: {
    back: "← All cases",
    label: "Our own case · AI customer service",
    title: "Our own support desk\nis the product we sell",
    lede: "The chat window at the bottom right of this site, and the LINE account @958nplck, run the same system. Not a demo reel — ask it about pricing now, then come back and see what it cost us.",
    ctaPrimary: "See the three tiers →",
    ctaLine: "Try it on LINE",
    stats: [
      { n: "NT$0.011", l: "model cost per conversation" },
      { n: "88.8%", l: "prompt cache hit rate" },
      { n: "81", l: "output tokens per reply" },
      { n: "0", l: "unauthorised accesses to date" },
    ],
    costLabel: "Measured cost",
    costTitle: "About one cent a conversation",
    costLede:
      "These are real token counts from the production database (November 2026), not estimates. The model is gpt-6-luna; the knowledge base is assembled from the live price list and runs about 3,700 tokens.",
    costRows: [
      ["Average input per reply", "3,763 tokens (3,342 served from cache)"],
      ["Average output per reply", "81 tokens"],
      ["Cost per reply", "US$0.000116"],
      ["A three-turn conversation", "about US$0.00035 ≒ NT$0.011"],
      ["5,000 conversations a month", "about NT$56"],
    ],
    costNote:
      "Which is why we do not bill you per conversation — the number is too small to justify a metering system. The tiers differ by knowledge base size, channels and integration depth, not tokens.",
    builtLabel: "How",
    builtTitle: "Cheap by design, not by luck",
    built: [
      {
        t: "The knowledge base is a stable prefix",
        d: "Every conversation starts with the same system message, which is what makes prompt caching hit. Cached input costs a tenth of the list price — that 88.8% is an order of magnitude on the bill.",
      },
      {
        t: "Prices come from code, not from memory",
        d: "The knowledge base is generated from the live price list rather than transcribed. Change a price and support changes its answer immediately; nobody has to remember.",
      },
      {
        t: "Short replies, reasoning off",
        d: "Replies are capped at about 150 characters. Nobody reads an essay on LINE, and fewer output tokens means both lower cost and a faster answer.",
      },
    ],
    wrongLabel: "What we got wrong",
    wrongTitle: "Two holes we only found in production",
    wrongLede: "Both were caught by real conversations on the live site. The fixes are now the default for every customer.",
    wrong: [
      {
        t: "It added the numbers up, and got them wrong",
        d: "Asked for a first-year total, the AI answered NT$169,930 including tax. The correct figure was 168,924. Models slip on multi-step arithmetic, and a wrong quote reads as a promise. Prices may now only be quoted verbatim; any total goes to the cart.",
      },
      {
        t: "A customer left a phone number and nobody was told",
        d: "Only the first handoff sent mail. The customer then gave their name and number — the most valuable message in the thread — and it notified no one. Every message after a handoff now sends mail, with the subject flagged when it contains contact details.",
      },
    ],
    humanLabel: "After the handoff",
    humanTitle: "The AI has to know when to stop talking",
    humanLede:
      "Once a conversation is handed over, the AI goes quiet on that LINE thread for 12 hours. Messages are still stored and still emailed to you, but it will not talk over you while you type. It resumes automatically, because a customer coming back next week about something else should not be met with silence.",
    stack: ["Next.js", "LINE Messaging API", "OpenAI", "SQLite", "prompt caching"],
    foot: "Want to see how it answers? It is in the corner of this page. Ask it something awkward and watch for the moment it says it is not sure and asks for your contact details.",
  },
} as const;

export default async function AvaloAiSupportCase({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = C[locale === "en" ? "en" : "zh-TW"];

  return (
    <main className="cs-page">
      <section className="section cs-hero">
        <Link href="/cases" className="cs-back">
          {c.back}
        </Link>
        <div className="mono-label">{c.label}</div>
        <h1 className="cs-title">{c.title}</h1>
        <p className="cs-lede">{c.lede}</p>
        <div className="cs-cta">
          <Link href="/services/line-ai-chatbot" className="btn-primary">
            {c.ctaPrimary}
          </Link>
          <LineCta label={c.ctaLine} className="btn-ghost" />
        </div>
        <div className="cs-stats">
          {c.stats.map((s) => (
            <div key={s.l} className="cs-stat">
              <div className="cs-stat-n">{s.n}</div>
              <div className="cs-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section cs-block">
        <div className="mono-label">{c.costLabel}</div>
        <h2 className="section-title">{c.costTitle}</h2>
        <p className="cs-lede-sm">{c.costLede}</p>
        <table className="cs-table">
          <tbody>
            {c.costRows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="cs-note">{c.costNote}</p>
      </section>

      <section className="section cs-block">
        <div className="mono-label">{c.builtLabel}</div>
        <h2 className="section-title">{c.builtTitle}</h2>
        <div className="cs-grid">
          {c.built.map((b) => (
            <div key={b.t} className="cs-card">
              <div className="cs-card-t">{b.t}</div>
              <p className="cs-card-d">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 這一節是整頁最該留著的部分：承認做壞過的事，比任何保證都有說服力 */}
      <section className="section cs-block cs-warn">
        <div className="mono-label">{c.wrongLabel}</div>
        <h2 className="section-title">{c.wrongTitle}</h2>
        <p className="cs-lede-sm">{c.wrongLede}</p>
        <div className="cs-grid cs-grid-2">
          {c.wrong.map((w) => (
            <div key={w.t} className="cs-card">
              <div className="cs-card-t">{w.t}</div>
              <p className="cs-card-d">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section cs-block">
        <div className="mono-label">{c.humanLabel}</div>
        <h2 className="section-title">{c.humanTitle}</h2>
        <p className="cs-lede-sm">{c.humanLede}</p>
        <div className="cs-tags">
          {c.stack.map((s) => (
            <span key={s} className="cs-tag">
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="section cs-foot">
        <p>{c.foot}</p>
        <div className="cs-cta">
          <Link href="/services/line-ai-chatbot" className="btn-primary">
            {c.ctaPrimary}
          </Link>
        </div>
      </section>
    </main>
  );
}
