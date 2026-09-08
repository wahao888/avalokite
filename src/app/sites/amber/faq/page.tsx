import type { Metadata } from "next";

import { SITE } from "../_data/site";
import { HelpCta } from "../_components/Blocks";
import { IconChevronDown, IconQuestion } from "../_components/Icons";

export const metadata: Metadata = {
  title: "常見問題",
  description: "關於連線代購、收單時間、運費、缺貨、退款與訂單查詢的常見問題。",
};

// 常見問題。
//
// 用原生 <details>：不需要一行 JavaScript，而且**沒有 JS 也全部讀得到**
// （LINE 內建瀏覽器偶爾很怪）。搜尋引擎與 Ctrl+F 也找得到摺起來的內容。
//
// ⚠ 每一則答案都必須是系統真的做得到的事。這一頁是客人事後爭執時
// 會被拿出來看的東西——寫得比實際做得到的多，第一個受害的是 Amber。
// 目前每一則都能在 _data/settle.ts、shipping.ts、daigou-data.ts 找到對應。

type QA = { q: string; a: React.ReactNode };

const GROUPS: { title: string; items: QA[] }[] = [
  {
    title: "關於連線",
    items: [
      {
        q: "什麼是「連線」？",
        a: (
          <p>
            一檔連線就是一趟採購行程。我們人到當地之前先開放下單，
            到收單時間截止，接著帶著大家的清單到品牌官網或門市現場採買，
            買完統一寄回台灣。所以每一檔都有自己的收單時間與到貨時間。
          </p>
        ),
      },
      {
        q: "為什麼要先付款才採買？",
        a: (
          <p>
            代購的商品是為你個別採購的，不是從庫存出貨。
            採買當下要用真的錢把東西買下來，所以採預購制：
            <strong>收單、結算金額、收到款項之後才安排採買</strong>。
          </p>
        ),
      },
      {
        q: "同時有好幾檔連線，可以一起買嗎？",
        a: (
          <>
            <p>
              可以一起選購，但要<strong>分開結帳</strong>。
              不同連線是不同國家、不同時間回台灣的兩個包裹，
              各自有自己的收單時間與運費。
            </p>
            <p>購物車會自動依連線分組，每一組一顆結帳按鈕。</p>
          </>
        ),
      },
      {
        q: "收單時間到了還能下單嗎？",
        a: (
          <p>
            不行。時間一到該檔商品就會關閉，因為採買的人已經要出門了。
            已經放進購物車但還沒結帳的商品也會被擋下並標示原因——
            我們不會默默把它從你的購物車移走。
          </p>
        ),
      },
    ],
  },
  {
    title: "價格與運費",
    items: [
      {
        q: "網站上的價格要再換匯率嗎？",
        a: (
          <p>
            不用。顯示的<strong>台幣售價就是最終售價</strong>，已含代購費用。
            結帳時唯一會另外加的只有運費。
          </p>
        ),
      },
      {
        q: "我分好幾天下單，運費會收好幾次嗎？",
        a: (
          <p>
            不會。同一檔連線內的訂單會自動併成<strong>一張出貨單</strong>，
            一起裝箱寄出，<strong>運費只收一次</strong>。
            連線期間可以放心陸續加購。
          </p>
        ),
      },
      {
        q: "運費多少？",
        a: (
          <p>
            寄送方式是 7-ELEVEN 交貨便，運費依包裹金額分級，
            每滿 1,000 元跳一級（1,000 元以內 60 元起）。
            實際金額在結單時計算，並且會完整列在你的結單明細裡。
          </p>
        ),
      },
      {
        q: "怎麼付款？",
        a: (
          <p>
            收單後我們會結算你這一檔的總金額，
            用 LINE 通知你，並附上一條你專屬的結單連結。
            點進去可以看到完整明細與匯款資訊，匯款後在同一頁回報末五碼就完成了。
          </p>
        ),
      },
    ],
  },
  {
    title: "缺貨與退換",
    items: [
      {
        q: "如果現場買不到怎麼辦？",
        a: (
          <>
            <p>
              那一個品項會標示為缺貨並<strong>從金額中扣掉</strong>，
              其餘商品照常出貨。已經付款的話，缺貨的金額會退還給你。
            </p>
            <p>
              如果整張訂單都沒買到，<strong>連運費也不會收</strong>。
            </p>
          </>
        ),
      },
      {
        q: "同一件很多人要，但現場數量不夠呢？",
        a: (
          <p>
            依<strong>下單時間先後</strong>分配，先下單的先給。
            沒分配到的品項算缺貨，處理方式同上。
          </p>
        ),
      },
      {
        q: "可以取消訂單或退換貨嗎？",
        a: (
          <>
            <p>
              下單付款後<strong>恕不接受取消、退貨與換貨</strong>，
              也不接受因個人喜好、尺寸不合、色差、味道等因素退換。
              國際運送造成的外盒輕微壓痕也不在退換範圍內。
            </p>
            <p>
              這是因為商品是為你個別採購的，沒有庫存可以退回。
              <strong>下單前請務必再次確認商品資訊。</strong>
            </p>
          </>
        ),
      },
      {
        q: "商品是正品嗎？",
        a: (
          <p>
            是。只從各國品牌官網與正規門市購買，不經第三方轉手。
            商品抵達台灣後會先檢查再安排寄出。
            建議你收到時<strong>錄影開箱</strong>，保障彼此權益。
          </p>
        ),
      },
    ],
  },
  {
    title: "訂單與帳號",
    items: [
      {
        q: "需要註冊會員嗎？",
        a: (
          <p>
            不用。不需要密碼、不需要簡訊驗證、也不用綁 LINE 登入。
            下單時填姓名和手機就好——
            <strong>同一支手機的訂單會自動歸到同一位客人</strong>，
            結單、運費、出貨都算在一起。
          </p>
        ),
      },
      {
        q: "怎麼查我的訂單？",
        a: (
          <>
            <p>下單完成後會給你一條專屬連結，那是最方便的入口。建議你：</p>
            <ul>
              <li>直接<strong>螢幕截圖</strong>那一頁，或</li>
              <li>複製連結傳給自己（LINE 記事本、備忘錄都可以）</li>
            </ul>
            <p>
              同一支手機下次進來，頁首會直接出現「我的訂單」。
              連結弄丟了也沒關係，用<strong>訂單編號加下單手機</strong>一樣查得到，
              編號只要打後 4 碼。
            </p>
          </>
        ),
      },
      {
        q: "換手機或清掉瀏覽器資料，訂單還在嗎？",
        a: (
          <p>
            訂單一直都在，只是這台新裝置不認得你。
            用<strong>訂單編號加下單手機</strong>
            在「查訂單」頁查詢即可，或直接在 LINE 問我們。
          </p>
        ),
      },
      {
        q: "可以宅配嗎？",
        a: (
          <p>
            主要的寄送方式是 7-ELEVEN 交貨便。
            如果需要宅配，請在下單前先用 LINE 跟我們確認。
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconQuestion size={14} stroke={2} />
          常見問題
        </p>
        <h1>常見問題</h1>
        <p>找不到答案的話，直接在 LINE 問 {SITE.name}，通常很快就會回。</p>
      </header>

      {GROUPS.map((g) => (
        <section className="am-section" key={g.title}>
          <div className="am-section__head">
            <h2>{g.title}</h2>
          </div>
          <div className="am-faq">
            {g.items.map((it) => (
              <details key={it.q}>
                <summary>
                  <span className="am-faq__q">Q</span>
                  {it.q}
                  <IconChevronDown size={17} stroke={2} className="am-i am-faq__x" />
                </summary>
                <div className="am-faq__a">{it.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <HelpCta />
    </div>
  );
}
