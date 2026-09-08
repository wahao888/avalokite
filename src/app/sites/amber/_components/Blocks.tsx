import { FEATURES, TRUST_CHIPS } from "../_data/nav";
import { SITE, TERMS } from "../_data/site";
import {
  NamedIcon,
  IconChat,
  IconChevronRight,
  IconSparkle,
  IconBag,
  IconBank,
  IconCheck,
  IconPlane,
  IconTag,
} from "./Icons";

// 首頁與各內容頁共用的區塊。
//
// 全部是伺服器元件、零 JS。它們是「說明」不是「功能」，
// 客人在 4G 上不該為了讀一段文字下載一包 JavaScript。

/** 服務特點。四張卡，桌機一排、手機兩排 */
export function Features() {
  return (
    <div className="am-feat">
      {FEATURES.map((f) => (
        <div className="am-feat__c" key={f.title}>
          <div className="am-feat__i">
            <NamedIcon name={f.icon} size={20} stroke={1.7} />
          </div>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * 手機版首頁的信任列。
 *
 * 放在商品格**下面**，不是上面——上面的每一個像素都屬於商品。
 * 這排東西的用途是「看完商品，順便知道這家是怎麼做事的」。
 */
export function TrustChips() {
  return (
    <ul className="am-trust" aria-label="服務說明">
      {TRUST_CHIPS.map((c) => (
        <li key={c.label}>
          <NamedIcon name={c.icon} size={15} stroke={1.9} />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * 購買流程。
 *
 * 六個步驟逐字取自客戶提供的出貨說明（site.ts 的 TERMS.flow），
 * 這裡只是替每一步配一個圖示與一句白話。**步驟名稱不要改**——
 * 那是她對客人說過的話。
 *
 * 兩種畫法，因為兩個地方要回答的問題不一樣：
 *
 *   rail      首頁的「怎麼買」。它是提要不是說明書，所以只給
 *             圖示＋編號＋步驟名，桌機橫著串成一條線。
 *             想看細節的人點下面那個連結去 /how。
 *   timeline  /how 的主體。直向時間軸，每一步帶一句說明。
 *
 * ⚠ 兩種都靠一條**連續的線**把六步串起來，不是六張各自獨立的卡片。
 * 卡片會讀成「六件事」，線才會讀成「一個流程」——而客人真正需要
 * 理解的是「我付了錢之後，東西還要經過這幾關才會到」。
 */
const FLOW_ICONS = [IconChat, IconTag, IconCheck, IconBank, IconBag, IconPlane];

const FLOW_NOTES = [
  "在 LINE 或網站上把想要的商品、尺寸、顏色、型號告訴我們。",
  "確認商品在當地買得到，回報台幣售價。網站上架的價格就是最終售價。",
  "在網站上送出訂單。同一檔連線可以陸續加購，會併成同一張出貨單。",
  "結單後通知你總金額與匯款方式。採預購制，收到款項才會安排採買。",
  "人到當地的品牌官網或門市現場採買。買不到的品項會退款。",
  "商品抵台後檢查，再用 7-11 交貨便寄出，並提供貨態編號。",
];

export function FlowSteps({ variant = "timeline" }: { variant?: "rail" | "timeline" }) {
  const rail = variant === "rail";

  return (
    <ol className={`am-flow am-flow--${variant}`}>
      {TERMS.flow.map((label, i) => {
        const Icon = FLOW_ICONS[i] ?? IconSparkle;
        return (
          <li key={label}>
            {/* 連接線畫在 li 上（::before），所以節點與線一定對得齊——
                用獨立的元素畫線，字級一變就會歪掉 */}
            <span className="am-flow__node">
              <Icon size={20} stroke={1.7} />
              <span className="am-flow__n">{i + 1}</span>
            </span>
            <div className="am-flow__body">
              <h3>{label}</h3>
              {!rail && <p>{FLOW_NOTES[i]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** 內容頁結尾的求助卡。她實際的客服管道就是 LINE，所以每一頁都導向那裡 */
export function HelpCta({
  title = "還有問題嗎？",
  body = "商品、尺寸、金額、到貨時間，直接在 LINE 問最快。",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="am-cta">
      <IconChat size={30} stroke={1.5} className="am-cta__i" />
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="am-btns">
        {SITE.lineAddUrl && (
          <a className="am-btn am-btn--accent" href={SITE.lineAddUrl}>
            <IconChat size={17} stroke={1.9} />
            加 LINE 好友 {SITE.lineId}
          </a>
        )}
        <a className="am-btn am-btn--ghost" href="/faq">
          看常見問題
          <IconChevronRight size={16} stroke={2} />
        </a>
      </div>
    </section>
  );
}
