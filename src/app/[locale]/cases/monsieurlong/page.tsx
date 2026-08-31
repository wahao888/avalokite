import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import type { Locale } from "@/i18n/routing";

// 客戶站掛子網域，主站連過去要用絕對網址（同源相對路徑會落回 apex 的 301）
const SITE_URL = tenantOrigin(getTenant("monsieurlong")!);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "Monsieur Long 隆先生 品牌官網｜形象官網案例 · Avalo 阿瓦羅"
      : "Monsieur Long Brand Site｜Brand-Website Case · Avalo",
    description: zh
      ? "為大稻埕手工 Gelato 品牌打造的形象官網：融化動態的品牌主視覺、程式生成的口味插畫、共享元素轉場，以及讓店家每天用手機更新「今日口味」的後台。"
      : "A brand website for an artisan gelato shop in Dadaocheng: a melting-motif hero, procedurally drawn flavour illustrations, shared-element transitions, and a phone-friendly back office for daily flavour updates.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "形象官網案例 · 餐飲品牌數位化",
    title: "每天都在換的菜單，\n做成不用重做的網站",
    lede: "Monsieur Long 隆先生是大稻埕貴德街上的手工 Gelato 店，主廚出身法式甜點，口味每天現做、每天不同。這種店最難的不是把網站做漂亮，是「做完之後誰來維護」。我們把口味拆成兩層：插畫、色票與文案這種幾個月才動一次的東西留在設計資產裡，「今天櫃上有哪幾款」則交給店家自己在手機上勾選——勾完存檔，官網的跑馬燈、今日供應板與口味頁立刻跟著換。",
    ctaPrimary: "打造我的品牌官網",
    ctaVisit: "造訪 Monsieur Long 官網 →",
    stats: [
      { n: "每日更新", l: "店家自己用手機勾選口味" },
      { n: "16 款", l: "程式生成的口味插畫" },
      { n: "0 張圖檔", l: "插畫全部是向量，免頻寬" },
      { n: "2 張表單", l: "合作邀請・伴手禮訂購" },
    ],
    conv: {
      label: "怎麼運作",
      title: "店家早上勾一勾，官網就換好了",
      desc: "冰淇淋店的內容一天一變，如果每次都要找工程師，網站三個月後就會停在過期的資訊上。所以我們把「會變的」跟「不會變的」分開，讓店家只碰會變的那一半，而且不需要任何技術背景。",
      steps: [
        { t: "開店前勾選", d: "手機開後台，把今天做的口味打勾，順手寫一句「今日提早售完」" },
        { t: "按下儲存", d: "純表單、沒有花俏介面，按一下就好——網站快取同時失效" },
        { t: "官網立刻換", d: "首頁跑馬燈、今日供應板、口味頁的「今日供應」標籤同時更新" },
      ],
    },
    arch: {
      label: "內容架構",
      title: "把「會變的」跟「不會變的」拆開",
      layers: [
        { t: "口味目錄", d: "插畫色票、風味文案、圖示母題。幾個月才動一次，屬於設計資產，走版控與部署", tag: "設計" },
        { t: "今日供應", d: "今天賣哪幾款、臨時新口味、一句公告。每天都變，住在資料庫，店家自助維護", tag: "營運" },
        { t: "自動判定", d: "期間限定填結束日期就會自己下架、新品自動掛 NEW，不用回頭手動清理", tag: "自動" },
      ],
    },
    feat: {
      label: "設計與技術",
      title: "品牌自己的視覺語言，做成會動的",
      items: [
        { t: "融化的邊緣", d: "黃色跑馬燈下緣掛著會呼吸、偶爾滴落的水滴，滑鼠靠近還會被拉長。取自店家 IG 限動的構圖，用貝茲曲線畫形狀、只動 transform，手機也不掉幀。" },
        { t: "灌滿的字", d: "品牌名的第二行載入時由下往上被冰淇淋灌滿，微微溢出再落回。墨色描邊撐住字形，所以液面高低都讀得到字。" },
        { t: "程式生成的口味插畫", d: "16 款口味不是 16 張圖檔，是同一個元件依色票與母題生成的向量插畫。新增口味只要填一個顏色，插畫自動成立。" },
        { t: "共享元素轉場", d: "點口味卡，那球冰會直接變形成詳頁的大圖。用瀏覽器原生的 View Transitions，不支援的瀏覽器就是不動，不會壞。" },
        { t: "兩張表單一個收件匣", d: "合作邀請與伴手禮／客製蛋糕走同一支 API、進同一個後台，店家只要看一個地方。前後端雙重驗證＋防機器人。" },
        { t: "手繪店舖地圖", d: "不嵌第三方地圖：那會在頁面上戳出一塊別人的視覺，也受安全政策限制。改畫大稻埕街廓示意圖，導航按鈕直接開 Google 地圖。" },
        { t: "營業狀態即時計算", d: "以台北時區判斷現在是營業中、今日公休還是已打烊，週二週三公休的規則寫一次全站共用。" },
        { t: "食安資訊不憑空填", d: "過敏原、含酒、素食欄位在店家逐項確認前一律留空，前台顯示「以店內標示為準」。這條規則有自動測試在守。" },
        { t: "效能與無障礙", d: "動畫全部走 transform 與 opacity；中文用系統字堆疊，省下半 MB 的字體 CSS。支援減少動態效果、鍵盤操作與跳至主要內容。" },
      ],
    },
    why: {
      label: "為什麼是形象官網",
      title: "餐飲品牌真正需要的不是漂亮，是活著",
      items: [
        { t: "不會過期", d: "菜單天天換的店，網站最怕停更。把維護權交回店家手上，網站才活得久。" },
        { t: "接得到生意", d: "品牌聯名、市集邀請、企業送禮的詢問都收進同一個後台，不靠私訊翻紀錄。" },
        { t: "值得被記住", d: "第一眼要讓人覺得這家店有個性——這件事沒有捷徑，只能從品牌自己的東西長出來。" },
      ],
    },
    finalCta: {
      title: "你的品牌，也值得一個不會過期的官網",
      desc: "不論是餐飲、選物還是任何內容天天在變的品牌，我們都能把「維護」設計進去，而不是留給你。先看看 Monsieur Long 的實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 Monsieur Long 官網 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Brand-Website Case · Food & Beverage",
    title: "A menu that changes daily,\non a site that never needs rebuilding",
    lede: "Monsieur Long is an artisan gelato shop on Guide Street in Taipei's Dadaocheng, run by a French-trained pastry chef. Flavours are made fresh every day and change every day. The hard part isn't making the site look good — it's who maintains it afterwards. So we split flavours into two layers: illustrations, colour and copy stay in the design assets where they change a few times a year, while \"what's in the case today\" is something the shop ticks off on their phone. Save, and the ticker, the daily board and the flavour pages all update at once.",
    ctaPrimary: "Build my brand website",
    ctaVisit: "Visit the Monsieur Long site →",
    stats: [
      { n: "Daily", l: "Shop updates flavours from a phone" },
      { n: "16", l: "Procedurally drawn flavour illustrations" },
      { n: "0 files", l: "All vector — no image bandwidth" },
      { n: "2 forms", l: "Collaborations · gift orders" },
    ],
    conv: {
      label: "How it works",
      title: "They tick a few boxes; the site is already updated",
      desc: "An ice cream shop's content changes daily. If every change needs a developer, the site is stale within three months. So we separated what changes from what doesn't, and gave the shop only the half that changes — no technical background required.",
      steps: [
        { t: "Tick before opening", d: "Open the back office on a phone, check today's flavours, add a note like \"sold out early today\"" },
        { t: "Hit save", d: "A plain form, nothing clever — one tap, and the site's cache is invalidated at the same time" },
        { t: "Site updates instantly", d: "Ticker, daily board and the \"available today\" tags all change together" },
      ],
    },
    arch: {
      label: "Content architecture",
      title: "Separating what changes from what doesn't",
      layers: [
        { t: "Flavour catalogue", d: "Illustration colours, tasting copy, motifs. Changes a few times a year — a design asset, versioned and deployed", tag: "Design" },
        { t: "Today's board", d: "Which flavours are out, ad-hoc new ones, one announcement line. Changes daily — lives in the database, owned by the shop", tag: "Operations" },
        { t: "Derived state", d: "Limited flavours retire themselves on their end date; new ones get a NEW badge automatically. No manual cleanup", tag: "Automatic" },
      ],
    },
    feat: {
      label: "Design & engineering",
      title: "The brand's own visual language, made to move",
      items: [
        { t: "A melting edge", d: "Drips hang from the yellow ticker, breathing slowly and occasionally falling; on desktop they stretch toward your cursor. Taken from the shop's own Instagram graphic, drawn with bezier curves and animated with transforms only — smooth on phones too." },
        { t: "Type that fills up", d: "On load, the second line of the wordmark fills with brand yellow from the bottom, overshoots slightly, then settles. An ink outline holds the letterforms so the words read at any fill level." },
        { t: "Procedural flavour art", d: "16 flavours are not 16 image files — they're one component generating vector illustrations from a colour and a motif. Add a flavour, add a hex, the art follows." },
        { t: "Shared-element transitions", d: "Tap a flavour card and that scoop morphs into the detail hero. Built on the browser's native View Transitions, so unsupported browsers simply don't animate." },
        { t: "Two forms, one inbox", d: "Collaboration enquiries and gift/custom-cake orders share one API and one back office, so the shop only checks one place. Validated on both ends, with bot protection." },
        { t: "Hand-drawn store map", d: "No embedded third-party map: it plants someone else's visuals mid-page and is restricted by our security policy anyway. We drew the Dadaocheng blocks instead; the button opens Google Maps directly." },
        { t: "Live opening status", d: "Open now, closed today or already shut — computed in Taipei time. The Tuesday/Wednesday closure is written once and shared site-wide." },
        { t: "No invented food-safety data", d: "Allergen, alcohol and vegan fields stay empty until the shop confirms each one; the site says \"see in-store labelling\". An automated test enforces it." },
        { t: "Performance & accessibility", d: "Animation is transform and opacity only; Chinese uses a system font stack, saving half a megabyte of font CSS. Reduced-motion, keyboard navigation and skip-to-content all supported." },
      ],
    },
    why: {
      label: "Why a brand website",
      title: "What a food brand needs isn't pretty — it's alive",
      items: [
        { t: "It doesn't go stale", d: "For a shop whose menu changes daily, the real risk is abandonment. Hand maintenance back to the owner and the site stays alive." },
        { t: "It catches business", d: "Collaborations, market invitations and corporate gifting all land in one back office — no scrolling through DMs." },
        { t: "It's worth remembering", d: "The site has to feel like this shop at first glance. There's no shortcut for that; it can only grow out of the brand's own material." },
      ],
    },
    finalCta: {
      title: "Your brand deserves a site that won't go stale",
      desc: "Food, retail or any brand whose content changes constantly — we design maintenance in rather than leaving it to you. Start by seeing what we built for Monsieur Long.",
      btn: "Book a free consultation",
      visit: "Visit the Monsieur Long site →",
    },
  },
} as const;

export default async function MonsieurLongCase({
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
