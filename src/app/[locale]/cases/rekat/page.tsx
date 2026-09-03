import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTenant, tenantOrigin } from "@/lib/tenants";
import type { Locale } from "@/i18n/routing";

// 客戶站掛子網域，主站連過去要用絕對網址（同源相對路徑會落回 apex 的 301）
const SITE_URL = tenantOrigin(getTenant("rekat")!);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return {
    title: zh
      ? "REKAT ROASTERY 日卡地自然農莊｜品牌官網與線上商店案例 · Avalo 阿瓦羅"
      : "REKAT ROASTERY｜Brand Site & Online Shop Case · Avalo",
    description: zh
      ? "為台東鹿野的自家烘焙咖啡打造品牌官網與線上商店：可點選的 SCA 風味輪、處理法圖解、烘焙曲線，程式生成的豆子插畫，以及讓烘豆師自己上下架的後台。"
      : "A brand site and online shop for a Taitung roastery: a clickable SCA flavour wheel, processing explainers, a roast curve, procedurally drawn bean illustrations, and a back office the roaster runs himself.",
  };
}

const C = {
  "zh-TW": {
    back: "← 回案例",
    label: "品牌官網＋線上商店案例 · 精品咖啡",
    title: "一包 1,800 元的豆子，\n要先讓人看懂它憑什麼",
    lede: "REKAT ROASTERY 日卡地自然農莊在台東鹿野，烘豆師王龍有三十年資歷，用的是藝伎、藍山、厭氧發酵這一級的生豆。這種商品的線上難題不在把品項列出來，而在於：客人憑什麼相信這一包值這個價？我們把烘豆師平常說得出口、但寫在網頁上就消失的判斷——風味的座標、處理法的差別、火要停在哪一秒——做成可以點、可以比對的圖解，讓專業自己說話，再把下單這件事接在它後面。",
    ctaPrimary: "打造我的品牌官網",
    ctaVisit: "造訪 REKAT 官網 →",
    stats: [
      { n: "0 張照片", l: "插畫與圖解全部程式生成" },
      { n: "3 組互動", l: "風味輪・處理法・烘焙曲線" },
      { n: "15 支", l: "豆單品項，店家自助上下架" },
      { n: "線上下單", l: "匯款與貨到付款，不經手金流" },
    ],
    conv: {
      label: "怎麼運作",
      title: "從「看不懂」到「下單」的三步",
      desc: "精品咖啡的轉換障礙不是價格，是資訊不對稱。客人看到「厭氧日曬・葡萄乾・可可」不知道那是什麼意思，就不會為它付一千二。所以整個動線是先給判斷依據，再給購買按鈕。",
      steps: [
        { t: "用風味輪找方向", d: "點內圈的九大家族，展開第二層描述詞，再直接跳到「本期有幾支這個調性」" },
        { t: "在單品頁確認", d: "批次卡式的規格表、風味輪廓圖、烘焙度刻度與該支的沖煮參數，一頁看完" },
        { t: "加入購物車結帳", d: "半磅裝、三包優惠自動套用，匯款或貨到付款，出貨前可線上回報末五碼" },
      ],
    },
    arch: {
      label: "資料架構",
      title: "三種變動節奏，三個地方管",
      layers: [
        { t: "豆單目錄", d: "品名、售價、風味家族、插畫母題、產區背景與文案。一季才動一次，屬於設計與編輯資產，走版控與部署", tag: "設計" },
        { t: "本期供應", d: "哪支售完、哪支下架、一句官網公告。隨時會變，住在資料庫，烘豆師用手機自助維護", tag: "營運" },
        { t: "訂單", d: "下單當下的品項與金額快照。豆單日後改價，舊訂單仍然對得起帳", tag: "交易" },
      ],
    },
    feat: {
      label: "設計與技術",
      title: "把專業知識做成看得懂的圖",
      items: [
        { t: "可點選的 SCA 風味輪", d: "依 SCA 與 World Coffee Research 2016 年版的九大家族自繪，點內圈展開第二層描述詞，並直接連到該調性的豆子。不用官方圖：那是版權素材，而且點不了。" },
        { t: "處理法的果實剖面", d: "咖啡果實剖成六層，切換處理法時把「乾燥前已經去掉的層」淡掉。濕剝法只剩銀皮與生豆兩層——一眼就看得出曼特寧為什麼跟其他豆子不是同一件事。" },
        { t: "會畫出來的烘焙曲線", d: "標出回溫點、轉黃、一爆與發展期比例，每一段點得動、有解說。這是對懂的人的暗號，對不懂的人的一堂三十秒的課。" },
        { t: "程式生成的豆子插畫", d: "客戶沒有商品照。15 支豆子不是 15 張圖檔，是同一個元件依風味家族與母題生成的向量落款印。新增一支只要填一個母題。" },
        { t: "研磨粗細對照", d: "「中細研磨，砂糖顆粒大小」對沒磨過豆子的人沒有畫面。改成五塊同面積、同密度、只有顆粒大小在變的取樣圖，差距用眼睛就量得出來。" },
        { t: "手繪的咖啡帶地圖", d: "視野裁在西經 162° 到東經 115°，剛好裝下從夏威夷可娜到蘇門答臘林東的九個產地。不嵌第三方地圖，避免在頁面上戳出一塊別人的視覺。" },
        { t: "金額只有一個真實來源", d: "計價是前後台共用的同一支純函式，購物車只存品項與數量、不存價格。前端送來的任何金額欄位一律忽略，伺服器重算——「改 devtools 拿便宜」在結構上不成立。" },
        { t: "三包優惠看得懂", d: "每一行維持「數量 × 單價」的直接乘法，優惠另外列一條減項，客人拿網頁對紙本豆單每一格都對得起來。免運門檻也是看折抵後的金額。" },
        { t: "資料誠實性有測試在守", d: "豆單的品名與售價逐列釘在測試裡，改錯會在 CI 紅起來；產區背景標明是公開資料整理、非批次卡；風味輪廓圖明講不是杯測分數。" },
      ],
    },
    why: {
      label: "為什麼這樣做",
      title: "高單價商品的線上化，賣的是判斷依據",
      items: [
        { t: "先建立信任", d: "客人不是不願意花錢，是不知道花得對不對。把判斷依據交出去，價格才站得住。" },
        { t: "維護權在店家", d: "賣完了就自己標售完，補到貨再改回來。網站不會因為沒人更新而停在過期的資訊上。" },
        { t: "不誇大、不編造", d: "沒拿到的批次資料就留空，推導出來的圖表就標示是示意。長期做生意，這比多寫幾個形容詞值錢。" },
      ],
    },
    finalCta: {
      title: "你的專業，值得被看懂",
      desc: "不論是精品食材、職人工藝還是任何「需要先講清楚才賣得動」的商品，我們都能把專業做成客人看得懂的東西，再把生意接在後面。先看看 REKAT 的實際成果。",
      btn: "預約免費諮詢",
      visit: "造訪 REKAT 官網 →",
    },
  },
  en: {
    back: "← Back to cases",
    label: "Brand Site + Online Shop · Specialty Coffee",
    title: "A NT$1,800 bag of beans\nhas to explain itself first",
    lede: "REKAT ROASTERY is a single-origin roastery in Luye, Taitung. Its roaster has thirty years behind the drum and works with green coffee at the Gesha, Blue Mountain and anaerobic-fermentation end of the market. The hard part online isn't listing the products — it's answering why a customer should believe this bag is worth the price. So we took the judgement a roaster can explain in person but that vanishes on a web page — where a flavour sits, what each processing method removes, which second to stop the fire — and turned it into things you can click and compare. The professional case makes itself; checkout simply follows it.",
    ctaPrimary: "Start a brand site",
    ctaVisit: "Visit REKAT →",
    stats: [
      { n: "0 photos", l: "Every illustration is generated in code" },
      { n: "3 explainers", l: "Flavour wheel · processing · roast curve" },
      { n: "15 coffees", l: "Listed and delisted by the shop itself" },
      { n: "Online orders", l: "Bank transfer and COD, no payment gateway" },
    ],
    conv: {
      label: "How it works",
      title: "Three steps from confused to checked out",
      desc: "The barrier in specialty coffee isn't price, it's asymmetry. Nobody pays NT$1,200 for \"anaerobic natural · raisin · cocoa\" if those words mean nothing to them. So the flow gives you the basis for a judgement before it gives you a buy button.",
      steps: [
        { t: "Find a direction", d: "Click a family on the flavour wheel, open the second ring, jump straight to the coffees in that register" },
        { t: "Confirm on the product page", d: "A batch-card spec table, a flavour profile chart, a roast scale and brewing parameters — all on one screen" },
        { t: "Add to cart and check out", d: "Half-pound bags, three-bag pricing applied automatically, transfer or cash on delivery" },
      ],
    },
    arch: {
      label: "Data architecture",
      title: "Three rhythms of change, three places to manage them",
      layers: [
        { t: "Bean catalogue", d: "Names, prices, flavour families, illustration motifs, origin background and copy. Changes once a season — a design and editorial asset, kept in version control", tag: "Design" },
        { t: "Current availability", d: "What's sold out, what's delisted, one line of notice. Changes any time — lives in the database, maintained by the roaster from his phone", tag: "Operations" },
        { t: "Orders", d: "A snapshot of items and amounts at the moment of purchase, so old orders still reconcile after the list is repriced", tag: "Transactions" },
      ],
    },
    feat: {
      label: "Design & engineering",
      title: "Turning expertise into pictures people can read",
      items: [
        { t: "A clickable SCA flavour wheel", d: "Drawn from the nine families of the 2016 SCA / World Coffee Research wheel. Click the inner ring to open the descriptors and jump to coffees in that register. The official artwork is licensed — and you can't click a PNG." },
        { t: "Processing as a cherry cross-section", d: "Six layers; switching method dims whichever ones are gone before drying. Wet-hulled leaves only silverskin and bean — you can see at a glance why Mandheling isn't the same kind of thing." },
        { t: "A roast curve that draws itself", d: "Turning point, yellowing, first crack and development ratio are all marked and clickable. A signal to those who know, a thirty-second lesson for those who don't." },
        { t: "Procedurally drawn beans", d: "The client had no product photography. Fifteen coffees aren't fifteen image files — they're one component generating a vector seal from flavour family and motif. Adding a coffee means naming a motif." },
        { t: "Grind size you can measure by eye", d: "\"Medium-fine, like table sugar\" means nothing if you've never ground coffee. Five swatches, same area, same density, only particle size changes." },
        { t: "A hand-drawn coffee belt", d: "Cropped to 162°W–115°E, which is exactly what it takes to hold all nine origins from Kona to Lintong. No third-party map embed punching someone else's visual language into the page." },
        { t: "One source of truth for money", d: "Pricing is a single pure function shared by browser and server; the cart stores items and quantities, never prices. Any amount sent from the client is ignored and recomputed — tampering in devtools is structurally impossible." },
        { t: "Legible bundle discounts", d: "Every line stays a plain quantity × price multiplication, with the discount as its own deduction — so the screen reconciles against the printed price list cell by cell." },
        { t: "Honesty enforced by tests", d: "Names and prices are pinned row by row in the test suite; origin background is labelled as public research rather than batch data; the flavour chart states plainly that it isn't a cupping score." },
      ],
    },
    why: {
      label: "Why this way",
      title: "Selling premium goods online means selling the basis for judgement",
      items: [
        { t: "Trust comes first", d: "Customers aren't unwilling to spend. They're unsure whether they're spending well. Hand over the basis for the decision and the price holds up." },
        { t: "The shop keeps control", d: "Sold out? Mark it sold out. Restocked? Change it back. The site never freezes on stale information for want of a developer." },
        { t: "No overclaiming", d: "Batch data we don't have stays blank; charts we derived say so. Over the life of a business that is worth more than another adjective." },
      ],
    },
    finalCta: {
      title: "Your expertise deserves to be understood",
      desc: "Whether it's specialty food, craft work, or anything that has to be explained before it sells, we can turn the expertise into something a customer can read — and put the business right behind it.",
      btn: "Book a free consultation",
      visit: "Visit REKAT →",
    },
  },
} as const;

export default async function RekatCase({ params }: { params: Promise<{ locale: string }> }) {
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
