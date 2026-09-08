import type { Metadata } from "next";

import { SITE, TERMS, SHIP_KIND_ZH } from "../_data/site";
import { FlowSteps, HelpCta } from "../_components/Blocks";
import {
  IconAlert,
  IconBox,
  IconChevronRight,
  IconClock,
  IconInfo,
  IconPlane,
  IconStore,
  IconTag,
} from "../_components/Icons";

export const metadata: Metadata = {
  title: "購買流程",
  description: "從下單到收貨，AmberPick 的代購流程、收單時間、運費計算與缺貨處理方式。",
};

// 購買流程說明頁。
//
// 這一頁存在的理由很實際：代購跟一般電商最大的差別是「你付了錢，東西還沒買」。
// 客人第一次遇到會怕，而那個怕會變成 LINE 上一連串「什麼時候會到」。
// 把時間軸、缺貨怎麼算、運費怎麼收一次講清楚，省下的是她的時間。
//
// ⚠ 所有規則都必須跟系統實際行為一致。這一頁寫的每一句
// 在 _data/settle.ts 與 _data/shipping.ts 裡都找得到對應的程式碼。

export default function HowPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconBox size={14} stroke={2} />
          購買流程
        </p>
        <h1>從下單到收貨，會發生什麼事</h1>
        <p>
          {SITE.name} 採預購制——你下單、付款之後，我們才到當地把東西買回來。
          這一頁把每一步、每一筆錢、每一種例外都寫清楚。
        </p>
      </header>

      <section className="am-section">
        <div className="am-section__head">
          <h2>六個步驟</h2>
        </div>
        <FlowSteps variant="timeline" />
      </section>

      <div className="am-prose">
        <h2>
          <IconClock size={19} stroke={1.8} />
          收單時間
        </h2>
        <p>
          每一檔連線都有明確的<strong>收單時間</strong>，顯示在商品上方的橫幅與每張商品卡上。
          時間一到，該檔商品就無法再下單——因為採買的人已經要出門了。
        </p>
        <p>
          同時可能有好幾檔連線在跑（例如韓國和日本各一檔）。
          它們是<strong>不同的兩趟</strong>：分別收單、分別出貨、分別計算運費，
          所以購物車裡也會分開結帳。
        </p>

        <h2>
          <IconTag size={19} stroke={1.8} />
          價格怎麼算
        </h2>
        <p>
          網站上看到的<strong>台幣售價就是最終售價</strong>，已經包含代購的費用。
          不會在結帳時再換算匯率、也不會另外加收代購服務費。
        </p>
        <p>
          唯一會另外加的是運費，而運費在<strong>結單時</strong>才計算——
          因為要等所有商品都採買完、確定包裹裡裝了什麼才算得出來。
        </p>

        <h2>
          <IconStore size={19} stroke={1.8} />
          運費
        </h2>
        <p>
          寄送方式是 <strong>7-ELEVEN 交貨便</strong>（{SHIP_KIND_ZH.cvs}）。
          運費依包裹的申報金額分級，每滿 1,000 元跳一級：
        </p>
        <div className="am-tablewrap">
          <table className="am-table">
            <thead>
              <tr>
                <th>包裹金額</th>
                <th>運費</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1 – 1,000 元</td><td>60 元</td></tr>
              <tr><td>1,001 – 2,000 元</td><td>70 元</td></tr>
              <tr><td>2,001 – 3,000 元</td><td>80 元</td></tr>
              <tr><td>3,001 – 4,000 元</td><td>90 元</td></tr>
              <tr><td>4,001 – 5,000 元</td><td>100 元</td></tr>
            </tbody>
          </table>
        </div>
        <div className="am-callout">
          <IconInfo size={19} stroke={1.8} />
          <p>
            <strong>同一檔連線，運費只收一次。</strong>
            連線期間你可以分好幾天、下好幾次單，這些訂單會自動併成一張出貨單，
            一起裝箱、一起寄，所以運費只算一次。實際金額會列在結單明細上。
          </p>
        </div>

        <h2>
          <IconAlert size={19} stroke={1.8} />
          買不到的話
        </h2>
        <p>
          代購是到現場買，門市有可能剛好沒貨。遇到這種情況：
        </p>
        <ul>
          <li>那一個品項會標示為<strong>缺貨</strong>，並從你的金額中扣掉</li>
          <li>其餘品項照常出貨，不會整張訂單取消</li>
          <li>如果你已經付款，<strong>缺貨的金額會退還</strong></li>
          <li>如果整張訂單都沒買到，連運費也不會收</li>
        </ul>
        <p>
          同一件商品有多位客人要、而現場數量不夠時，
          依<strong>下單時間先後</strong>分配。
        </p>

        <h2>
          <IconPlane size={19} stroke={1.8} />
          出貨與到貨
        </h2>
        <p>
          商品抵達台灣後會先檢查，再安排寄出，並提供貨態編號。
          你可以在自己的訂單頁面看到編號與預計到貨日。
        </p>
        <p>
          <strong>收到商品時請錄影開箱</strong>，這是保障彼此權益最有效的做法。
        </p>

        <h2>付款後的規範</h2>
        <p>
          下單付款後<strong>恕不接受{TERMS.noRefund.join("、")}</strong>。
          代購的商品是為你個別採購的，沒有庫存可以退回。
          下單前請再次確認商品資訊。
        </p>
        <div className="am-btns" style={{ marginTop: "1rem" }}>
          <a className="am-btn am-btn--ghost" href="/terms">
            看完整購買規範
            <IconChevronRight size={16} stroke={2} />
          </a>
        </div>
      </div>

      <HelpCta />
    </div>
  );
}
