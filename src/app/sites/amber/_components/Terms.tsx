import { TERMS, SITE } from "../_data/site";

// 購買規範。
//
// 「恕不接受退貨換貨」這種條款，客人事後說「我不知道」的時候，
// **唯一站得住腳的是「你下單前看得到」**。所以這個區塊要出現在
// 結帳的送出鈕上方（不是收在頁尾的連結裡），以及結單頁。
//
// 文字逐字取自客戶提供的出貨說明，不潤飾——那是她對客人的承諾與
// 免責範圍，改一個字就可能改變意思。

export function Terms({ compact = false }: { compact?: boolean }) {
  return (
    <section className="am-terms" aria-label="購買規範">
      <h2 className="am-terms__h">購買流程與規範</h2>

      <ol className="am-terms__flow">
        {TERMS.flow.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {!compact && (
        <>
          <h3 className="am-terms__sub">出貨說明</h3>
          <ul className="am-terms__list">
            {TERMS.shipping.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}

      <h3 className="am-terms__sub am-terms__sub--warn">下單後恕不接受</h3>
      <ul className="am-terms__list am-terms__list--warn">
        {TERMS.noRefund.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {/* 客戶明確確認：付款後不得取消，但代購買不到會退款。
          這一句要講清楚，否則「恕不接受取消」會被誤讀成「缺貨也不退」。 */}
      <p className="am-terms__note">
        <strong>代購買不到的商品會全額退款</strong>，不會收取那筆費用。
      </p>

      <p className="am-terms__note">{TERMS.notice}</p>

      {SITE.lineAddUrl && (
        <p className="am-terms__note">
          有任何問題請透過 LINE <a href={SITE.lineAddUrl}>{SITE.lineId}</a> 聯絡我們。
        </p>
      )}
    </section>
  );
}
