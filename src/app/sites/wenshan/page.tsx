import Link from "next/link";
import { SITE, WS } from "./_data/site";
import { CATALOG } from "./_data/catalog";
import { FREIGHT_ZONES, FREIGHT_NOTES } from "./_data/freight";
import HeroPlane from "./_components/HeroPlane";
import HeroGrainField from "./_components/HeroGrainField";
import HeroJoint from "./_components/HeroJoint";
import HeroLog from "./_components/HeroLog";

// hero 互動動畫版本：
// "grain" 流動木紋場（滿版背景）/ "plane" 鉋刀刨花（右側木板）
// "joint" 榫卯組裝（右側構件）/ "log" 原木斷面切片（右側 3D，three.js）
type HeroStyle = "grain" | "plane" | "joint" | "log";
const HERO_STYLE: HeroStyle = "log";

const HERO_HINTS: Record<HeroStyle, string> = {
  grain: "試試看：移動滑鼠讓木紋讓路，點一下空白處種一顆節疤",
  plane: "試試看：按住游標，在右邊的木板上鉋一刀",
  joint: "試試看：把右邊的淺色木料往下拖（或往下捲動），讓榫卯咬合到位",
  log: "試試看：移動滑鼠轉動原木，點一下鋸下一片",
};
import GrainDivider from "./_components/GrainDivider";
import VenuePicker from "./_components/VenuePicker";
import FreightEstimator from "./_components/FreightEstimator";
import CatalogIcon from "./_components/CatalogIcon";
import ServiceIcon from "./_components/ServiceIcon";
import FacilityIcon from "./_components/FacilityIcon";

export const metadata = {
  title: "文山木材行｜北投關渡 木材・角材・夾板專門",
};

const SERVICES = [
  {
    id: "retail",
    title: "木料零售批發",
    desc: "一支角材到整車板料都歡迎。關渡大型倉庫現貨供應，常用規格不用等。",
  },
  {
    id: "cutting",
    title: "代客裁切加工",
    desc: "裁切、刨光、導角、鑽孔。裁好標好送到工地，下車就能用。",
  },
  {
    id: "delivery",
    title: "工地配送到點",
    desc: "雙北免費配送到工地，週一至週六 07:00 出車，跟上你的工班進度。",
  },
  {
    id: "consult",
    title: "選料諮詢",
    desc: "帶圖來、用講的都行。黃老闆親自看料給建議，該省的幫你省，該挑的幫你挑。",
  },
];

const FACILITIES = [
  {
    id: "workspace",
    title: "現場施工場地",
    desc: "買了料不必先運回去。我們的場地開放給合作師傅當場裁切、組裝、加工，量好尺寸就地做完，直接載去工地。",
    points: [
      "省一趟運料往返，工期抓得更準",
      "現場缺料、尺寸要改，隨時補、隨時裁",
      "駐店師傅與設備就在旁邊，有問題馬上問",
    ],
  },
  {
    id: "storage",
    title: "倉庫工具寄放",
    desc: "電鋸、釘槍、手工具不用每天扛上下車。倉庫提供師傅寄放空間，來的時候拿、走的時候放。",
    points: [
      "重工具留在店裡，人到就開工",
      "長期配合的師傅可長期寄放",
      "料與工具放一起，備料一次搞定",
    ],
  },
];

const FLOW = [
  { title: "說需求", desc: "線上估價單、來電或到店。有圖給圖，沒圖用講的也行。" },
  { title: "回報價", desc: "黃老闆依需求選料報價，順便告訴你哪裡可以更省。" },
  { title: "備好料", desc: "現貨揀料、代客裁切，裁好標好，等你叫車。" },
  { title: "送到點", desc: "雙北工地免運配送，或到關渡倉庫自取看料。" },
];

const FAQS = [
  {
    q: "可以只買一支角材嗎？",
    a: "可以。零售、批發我們都做，散客、木工師傅、統包工班都是老朋友，量少不會被打折服務。",
  },
  {
    q: "「才」是怎麼算的？",
    a: "角材 1才＝1寸×1寸×10尺；板料 1才＝1尺×1尺。不會算沒關係，型錄頁有才數計算機，或把尺寸告訴我們就好。",
  },
  {
    q: "代客裁切怎麼收費？",
    a: "依裁刀數計費，簡單幾刀通常是小錢。把尺寸圖或料單給我們，報價時會一併列出來。",
  },
  {
    q: "雙北以外怎麼收運費？",
    a: "基隆、桃園每趟 NT$1,200 起，新竹、宜蘭 NT$2,000 起，苗栗以南與花東採專案報價；每趟含 500 才，超出部分每 100 才加收 NT$200。詳見運送方式，或用運費試算器抓個大概。",
  },
  {
    q: "沒有圖面可以估價嗎？",
    a: "可以。告訴我們場域（住家、店面、工地⋯）跟大概要做什麼，黃老闆會幫你抓料。估價單裡也可以直接用文字備註。",
  },
  {
    q: "付款方式有哪些？",
    a: "現金、轉帳皆可，工程客戶可談月結。詳細方式報價時一併說明。",
  },
  {
    q: "可以在你們那裡施工嗎？",
    a: "可以。我們的場地開放給合作的木工師傅使用，買了料當場就能裁切、組裝、加工，省下一趟運料往返。使用方式歡迎來電或到店跟黃老闆談。",
  },
  {
    q: "工具可以寄放在你們倉庫嗎？",
    a: "可以。倉庫提供師傅寄放工具的空間，電鋸、釘槍這些重家伙不用每天扛上下車，人到就能開工。長期配合的師傅也可以長期寄放。",
  },
  {
    q: "可以到現場自取嗎？",
    a: "歡迎！關渡倉庫週一至週六 07:00 開門，來現場看料挑料，順便聽黃老闆講講木頭。",
  },
];

export default function WenshanHome() {
  return (
    <main>
      {/* Hero */}
      <section className={HERO_STYLE === "grain" ? "ws-hero ws-hero--field" : "ws-hero"}>
        {HERO_STYLE === "grain" && <HeroGrainField />}
        <div className="ws-wrap ws-hero__in">
          <div>
            <p className="ws-eyebrow">關渡・北投・傳承三代</p>
            <h1 className="ws-hero__title">
              好木料，<em>關渡</em>出。
            </h1>
            <p className="ws-hero__lede">
              文山木材行，深耕北投近百年的木材專門店。角材、夾板、板料現貨齊全，
              代客裁切、雙北工地免費配送——選料的事，交給我們。
            </p>
            <div className="ws-hero__cta">
              <Link href={`${WS}/quote`} className="ws-btn ws-btn--primary">
                線上估價
              </Link>
              <a href={`tel:${SITE.phoneTel}`} className="ws-btn ws-btn--ghost">
                ☎ {SITE.phoneDisplay}
              </a>
            </div>
            <p className="ws-hero__hint">{HERO_HINTS[HERO_STYLE]}</p>
          </div>
          {HERO_STYLE === "plane" && <HeroPlane />}
          {HERO_STYLE === "joint" && <HeroJoint />}
          {HERO_STYLE === "log" && <HeroLog />}
        </div>
      </section>

      {/* 信任列 */}
      <section className="ws-trust">
        <div className="ws-wrap ws-trust__in ws-reveal">
          <div className="ws-trust__item">
            <span className="ws-trust__num">{SITE.rating} ★</span>
            <span className="ws-trust__label">Google 地圖顧客評價</span>
          </div>
          <div className="ws-trust__item">
            <span className="ws-trust__num">近百年</span>
            <span className="ws-trust__label">深耕關渡北投・傳承三代</span>
          </div>
          <div className="ws-trust__item">
            <span className="ws-trust__num">雙北免運</span>
            <span className="ws-trust__label">配送到工地・週一至週六出車</span>
          </div>
          <div className="ws-trust__item">
            <span className="ws-trust__num">師傅友善</span>
            <span className="ws-trust__label">施工場地・工具寄放</span>
          </div>
        </div>
      </section>

      {/* 服務 */}
      <section className="ws-section">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">Services</p>
            <h2 className="ws-h2">從一支角材，到一整個工地</h2>
            <p className="ws-lede">
              不管你是自己動手的屋主、趕工期的師傅，還是長期配合的統包，我們的服務都一樣周到。
            </p>
          </div>
          <div className="ws-grid ws-grid--4 ws-reveal">
            {SERVICES.map((s) => (
              <div key={s.title} className="ws-card-i">
                <ServiceIcon id={s.id} />
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GrainDivider />

      {/* 服務流程 */}
      <section className="ws-section ws-section--tint">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">How it works</p>
            <h2 className="ws-h2">四步，把料備到你工地</h2>
          </div>
          <div className="ws-flow ws-reveal">
            {FLOW.map((f) => (
              <div key={f.title} className="ws-flow__step">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 型錄預覽 */}
      <section className="ws-section" id="catalog">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">Catalog</p>
            <h2 className="ws-h2">木料目錄</h2>
            <p className="ws-lede">
              常備現貨十二大類。找不到的、特殊規格的，來電問一聲，通常都調得到。
            </p>
          </div>
          <div className="ws-grid ws-grid--3 ws-reveal">
            {CATALOG.map((cat) => (
              <Link key={cat.id} href={`${WS}/products#${cat.id}`} className="ws-catcard">
                <CatalogIcon id={cat.id} />
                <div className="ws-catcard__head">
                  <h3>{cat.name}</h3>
                </div>
                <p className="ws-catcard__blurb">{cat.blurb}</p>
                <p className="ws-catcard__specs">
                  {cat.items
                    .slice(0, 3)
                    .map((i) => i.name)
                    .join("｜")}
                </p>
                <span className="ws-catcard__more">看規格</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <GrainDivider flip />

      {/* 場域快選 */}
      <section className="ws-section ws-section--tint" id="venues">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">Start here</p>
            <h2 className="ws-h2">你的工程在哪裡？</h2>
            <p className="ws-lede">
              選一個場域，我們先幫你把常用料列出來——不用懂木頭，也能把需求講清楚。
            </p>
          </div>
          <div className="ws-reveal">
            <VenuePicker />
          </div>
        </div>
      </section>

      {/* 師傅專屬設施 —— 同業少有的差異化 */}
      <section className="ws-section" id="facility">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">For pros</p>
            <h2 className="ws-h2">師傅，這裡也是你的工作場</h2>
            <p className="ws-lede">
              不只賣料。我們把場地和倉庫開放給合作的木工師傅——買了料當場就能施工，
              工具不用天天扛來扛去。這是同業少有的服務，也是我們最想給師傅的方便。
            </p>
          </div>
          <div className="ws-grid ws-grid--2 ws-reveal">
            {FACILITIES.map((f) => (
              <div key={f.id} className="ws-card-i ws-card-i--wide">
                <FacilityIcon id={f.id} />
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <ul className="ws-ul ws-card-i__points">
                    {f.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <p className="ws-notes ws-reveal">
            場地使用與倉租方式依需求與期間安排，歡迎來電 {SITE.phoneDisplay} 或到店與黃老闆談。
          </p>
        </div>
      </section>

      <GrainDivider />

      {/* 運送與運費 */}
      <section className="ws-section ws-section--tint" id="delivery">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">Delivery</p>
            <h2 className="ws-h2">
              運送方式 <span className="ws-badge-free">雙北工地免運</span>
            </h2>
            <p className="ws-lede">
              自有車隊，週一至週六 07:00 出車。材料綁好墊好，到點不缺角。
            </p>
          </div>
          <div className="ws-reveal">
            <div className="ws-tablewrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>配送區域</th>
                    <th>運費</th>
                  </tr>
                </thead>
                <tbody>
                  {FREIGHT_ZONES.map((z) => (
                    <tr key={z.id}>
                      <td>{z.label}</td>
                      <td className="ws-price">
                        {z.baseFee === 0 ? (
                          <span className="ws-badge-free">免運</span>
                        ) : z.baseFee === null ? (
                          "專案報價"
                        ) : (
                          `NT$${z.baseFee.toLocaleString()}／趟 起`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="ws-ul ws-notes">
              {FREIGHT_NOTES.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <FreightEstimator />
          </div>
        </div>
      </section>

      <GrainDivider />

      {/* 關於我們 */}
      <section className="ws-section ws-section--tint" id="about">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">About</p>
            <h2 className="ws-h2">三代人，做同一件事：把料顧好</h2>
          </div>
          <div className="ws-about ws-reveal">
            <div className="ws-about__story">
              <p>
                文山木材行在北投起家，走過近一個世紀。從第一代肩挑手扛，
                到現在關渡的大倉庫，我們只做一件事——把木料顧好，把客人顧好。
              </p>
              <p>
                現在掌店的黃老闆，是從小在木堆裡長大的第二代；第三代也已經回到店裡，
                把老手藝接上新工具。你拿圖來，他幫你抓料省料；你不懂木頭，
                他用聽得懂的話講給你聽。這是老店的規矩：料實在，話也實在。
              </p>
              <p>
                住家裝修、店面工程、工地結構、戶外景觀——不論案子大小，
                歡迎來關渡看看料，或者先送出一張估價單，讓我們接手。
              </p>
            </div>
            <div className="ws-infocard">
              <h3>營業資訊</h3>
              <dl>
                <div>
                  <dt>地址</dt>
                  <dd>
                    <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
                      {SITE.addressFull}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>電話</dt>
                  <dd>
                    <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
                  </dd>
                </div>
                <div>
                  <dt>營業時間</dt>
                  <dd>{SITE.hoursDisplay}</dd>
                </div>
                <div>
                  <dt>Google 評價</dt>
                  <dd>
                    <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
                      {SITE.rating} ★（Google 地圖）
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* 顧客好評 */}
      <section className="ws-section">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">Reviews</p>
            <h2 className="ws-h2">老客人怎麼說</h2>
            <p className="ws-lede">
              Google 地圖 {SITE.rating} 顆星。以下摘錄自顧客回饋（完整評論請見
              <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                Google 地圖
              </a>
              ）。
            </p>
          </div>
          {/* 評論文字為示意佔位，正式上線前替換為客戶提供／授權之真實評論 */}
          <div className="ws-reviews ws-reveal">
            <blockquote className="ws-review">
              <div className="ws-review__stars">★★★★★</div>
              <p>「老闆非常親切，第一次自己買木料也不會被當外行，還教我怎麼挑。」</p>
              <footer className="ws-review__who">住家裝修客戶</footer>
            </blockquote>
            <blockquote className="ws-review">
              <div className="ws-review__stars">★★★★★</div>
              <p>「料好、裁得準、送得準時，配合起來很省心，工班都指定跟他們叫料。」</p>
              <footer className="ws-review__who">室內裝修統包</footer>
            </blockquote>
            <blockquote className="ws-review">
              <div className="ws-review__stars">★★★★★</div>
              <p>「倉庫很大現貨很齊，臨時追加也調得出來，價格實在。」</p>
              <footer className="ws-review__who">木工師傅</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="ws-section ws-section--tint" id="faq">
        <div className="ws-wrap">
          <div className="ws-reveal">
            <p className="ws-eyebrow">FAQ</p>
            <h2 className="ws-h2">常見問題</h2>
          </div>
          <div className="ws-faq ws-reveal">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="ws-section">
        <div className="ws-wrap ws-reveal">
          <div className="ws-cta-band">
            <h2>把料單交給我們，你去忙工程</h2>
            <p>三分鐘填好估價需求，營業時間內回覆報價。不用註冊、不收費用。</p>
            <Link href={`${WS}/quote`} className="ws-btn ws-btn--primary">
              開始線上估價
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
