import type { Metadata } from "next";

import { SITE } from "../_data/site";
import { HelpCta } from "../_components/Blocks";
import { IconInfo, IconLock } from "../_components/Icons";

export const metadata: Metadata = {
  title: "隱私權政策",
  description: "AmberPick 蒐集哪些資料、為什麼需要、保存多久，以及你可以怎麼處理。",
};

// 隱私權政策。
//
// ⚠ 這一頁不是抄來的樣板，是**照系統實際行為寫的**：
// 蒐集的欄位對照 DgMember / DgOrder 的 schema，
// 「這台裝置記住的東西」對照 CartProvider 與 CheckoutForm 的 localStorage key，
// 「不可猜的連結」對照 DgMember.lookupToken。
// 寫一份跟程式不符的隱私政策，比沒有還糟。
//
// TODO(客戶確認)：Amber 是個人還是公司行號、有沒有統編、
// 以及她願意保存訂單資料多久。目前寫的是系統現況（不主動刪除）。

export default function PrivacyPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconLock size={14} stroke={2} />
          隱私權政策
        </p>
        <h1>隱私權政策</h1>
        <p>
          這一頁說明 {SITE.name} 蒐集哪些資料、為什麼需要、
          存在哪裡，以及你可以怎麼處理。
        </p>
      </header>

      <div className="am-prose">
        <h2>我們蒐集什麼</h2>
        <p>只蒐集完成一筆代購訂單所必需的資料：</p>
        <ul>
          <li><strong>姓名與手機</strong>——聯絡你、以及把你分散在多天的訂單歸到同一位客人</li>
          <li><strong>收件資訊</strong>——超商門市名稱與店號，或宅配地址</li>
          <li><strong>LINE 名稱或 ID</strong>（選填）——方便在群組裡找到你</li>
          <li><strong>Email</strong>（選填）</li>
          <li><strong>訂單內容</strong>——你買了什麼、金額、狀態、匯款回報的末五碼</li>
        </ul>
        <p>
          我們<strong>不會</strong>蒐集你的身分證字號、銀行帳號全碼、
          信用卡號，網站上也沒有任何欄位可以填這些。
          匯款回報只需要末五碼，那是用來核對帳目、不足以識別你的帳戶。
        </p>

        <h2>為什麼手機號碼特別重要</h2>
        <p>
          手機號碼是這個網站用來<strong>認人的方式</strong>。
          連線期間你可能分好幾天下單，系統靠手機號碼把這些訂單併成一張出貨單，
          運費才收得成一次。
        </p>
        <p>
          我們刻意<strong>不要求你設密碼、不發簡訊驗證、也不強制綁 LINE 登入</strong>——
          那些對一次性的代購來說太麻煩。代價是：查詢訂單時需要
          <strong>訂單編號加手機號碼兩者都對</strong>才查得到，
          只知道其中一項是查不出任何東西的。
        </p>

        <h2>你的專屬連結</h2>
        <p>
          下單後我們會給你一條專屬連結（網址裡有一段隨機字串）。
          <strong>拿到那條連結的人就看得到那些訂單</strong>，所以請不要轉貼到公開場合。
        </p>
        <p>
          正因為如此，那個頁面上的姓名、電話、地址都是
          <strong>遮罩顯示</strong>的（例如「王＊明」「0912-***-678」），
          萬一連結被轉傳，個資也不會整份外洩。
        </p>

        <h2>這台裝置上記住的東西</h2>
        <p>
          為了讓你第二次下單不必重填，瀏覽器會在<strong>你自己的裝置上</strong>
          記住幾樣東西（localStorage，不是 cookie，也不會傳給第三方）：
        </p>
        <ul>
          <li>購物車內容</li>
          <li>上次填的姓名、手機、收件資訊</li>
          <li>你的專屬訂單連結</li>
          <li>你選的深色或淺色模式</li>
        </ul>
        <p>
          這些資料只存在這台裝置裡。清除瀏覽器資料就會消失，
          但你的訂單不受影響（用訂單編號加手機一樣查得到）。
        </p>

        <h2>資料存在哪裡</h2>
        <p>
          訂單資料存放在本站的伺服器上。
          網站全程使用 HTTPS 加密連線。
          我們<strong>不會把你的資料販售或提供給行銷用途的第三方</strong>。
        </p>
        <p>
          必要時只會提供給完成這筆訂單所需的對象——例如寄件時，
          超商物流會需要收件人姓名、電話與門市資訊。
        </p>

        <h2>Cookie 與追蹤</h2>
        <p>
          本站<strong>沒有安裝任何第三方廣告或分析追蹤程式</strong>，
          也沒有跨站追蹤。
        </p>

        <h2>你可以要求什麼</h2>
        <p>
          你可以隨時要求查詢、更正或刪除你的個人資料。
          請透過 LINE {SITE.lineId} 聯絡我們。
        </p>
        <div className="am-callout">
          <IconInfo size={19} stroke={1.8} />
          <p>
            已完成的交易紀錄（訂單、金額、收付款）
            因為對帳與售後查詢的需要會保留，
            但你可以要求移除聯絡方式與收件資訊。
          </p>
        </div>
      </div>

      <HelpCta
        title="對個資處理有疑問？"
        body="任何跟你的資料有關的問題，都可以直接在 LINE 上問。"
      />
    </div>
  );
}
