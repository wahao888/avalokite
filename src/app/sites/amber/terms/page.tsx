import type { Metadata } from "next";

import { SITE, TERMS } from "../_data/site";
import { Terms } from "../_components/Terms";
import { HelpCta } from "../_components/Blocks";
import { IconChevronRight, IconDoc, IconInfo } from "../_components/Icons";

export const metadata: Metadata = {
  title: "購買規範",
  description: "AmberPick 的購買流程、出貨說明與退換貨規範。",
};

// 購買規範的獨立頁面。
//
// 規範本身仍然會出現在**結帳的送出鈕上方**（見 CheckoutForm）——
// 這一頁不是要取代那裡，是給「還沒下單、想先看清楚」的人，
// 以及事後要回頭查證的人一個固定的網址。
//
// 內容直接重用 <Terms />，不另外抄一份。抄一份的下場是有一天兩邊不一樣，
// 而那時候沒有人分得出哪一份才是她真正說過的話。

export default function TermsPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconDoc size={14} stroke={2} />
          購買規範
        </p>
        <h1>購買規範</h1>
        <p>
          以下內容在你結帳前也會完整顯示一次。下單即表示同意這些規範。
        </p>
      </header>

      <Terms />

      <div className="am-callout">
        <IconInfo size={19} stroke={1.8} />
        <p>
          <strong>「恕不接受取消」不等於「缺貨也不退」。</strong>
          代購現場買不到的商品一律全額退還，那筆錢不會收。
          不接受的是「東西買到了、但你改變主意」的取消與退換。
        </p>
      </div>

      <div className="am-prose">
        <h2>為什麼代購不能退換</h2>
        <p>
          一般電商的商品有庫存，你退回去它可以再賣給下一個人。
          代購沒有庫存——每一件都是<strong>為你個別採購</strong>的，
          在當地用現金買下、跨國運回台灣。退回來的商品沒有下一個買家。
        </p>
        <p>
          所以 {TERMS.notice}
        </p>

        <h2>國際運送的合理耗損</h2>
        <p>
          商品跨國運送會經過多次搬運，
          <strong>外盒的輕微壓痕屬於合理範圍</strong>，不在退換範圍內。
          商品本體如有損壞或與描述不符，請在收到時錄影開箱並立即聯絡我們。
        </p>
      </div>

      <div className="am-btns" style={{ marginTop: "1.5rem" }}>
        <a className="am-btn am-btn--ghost" href="/how">
          看購買流程說明
          <IconChevronRight size={16} stroke={2} />
        </a>
        <a className="am-btn am-btn--ghost" href="/privacy">
          隱私權政策
          <IconChevronRight size={16} stroke={2} />
        </a>
      </div>

      <HelpCta
        title={`對規範有疑問？`}
        body={`下單前有任何不確定的地方，先在 LINE 問 ${SITE.name} 最好。`}
      />
    </div>
  );
}
