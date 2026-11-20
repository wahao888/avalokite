import { useTranslations } from "next-intl";
import { fmt, getProduct } from "@/lib/products";

/**
 * 選擇比較：Avalo 與三種常見替代方案
 *
 * 上面的 MarketChart 比的是「價格」，這裡比的是「同樣花錢，拿到什麼」。
 * 刻意用類型（傳統設計公司、自助平台、客服 SaaS）而不點名任何品牌：
 * 點名比較屬於比較廣告，每一句都要能舉證、隨對方改價就過期；類型比較只描述
 * 公開可查的普遍做法，也比較符合品牌口吻。
 * 文案來源與查核日期寫在 messages 的 compare.note，改內容時一起更新。
 *
 * 版面：桌機是表格（Avalo 欄位反白）；手機每一列變成一張卡，Avalo 的答案在最上面，
 * 其他三種用小字列在下面——四欄表格塞進手機寬度只能橫向捲動，沒有人會捲。
 */

interface Row {
  topic: string;
  ours: string;
  others: [string, string, string];
}

export default function Compare() {
  const t = useTranslations("compare");
  const cols = t.raw("cols") as [string, string, string, string];
  const rows = t.raw("rows") as Row[];

  // 起步價那一列的 Avalo 數字從 products.ts 讀，調價時不會漏改這裡
  const web = getProduct("web-basic")!;
  const webCare = getProduct(web.recommendedCareSku!)!;
  const ai = getProduct("ai-chatbot-lite")!;
  const aiCare = getProduct(ai.recommendedCareSku!)!;
  const fill = (s: string) =>
    s
      .replace("{web}", fmt(web.price))
      .replace("{webCare}", fmt(webCare.price))
      .replace("{ai}", fmt(ai.price))
      .replace("{aiCare}", fmt(aiCare.price));

  return (
    <section id="compare" className="section compare-section">
      <div className="section-header fade-in">
        <div>
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>
        </div>
        <p className="section-intro">{t("intro")}</p>
      </div>

      <div className="cmp fade-in" role="table" aria-label={t("aria")}>
        <div className="cmp-head" role="row">
          <span role="columnheader" className="cmp-topic-head" />
          {cols.map((c, i) => (
            <span role="columnheader" key={c} className={i === 0 ? "cmp-ours" : undefined}>
              {c}
            </span>
          ))}
        </div>

        {rows.map((r) => (
          <div className="cmp-row" role="row" key={r.topic}>
            <span className="cmp-topic" role="rowheader">
              {r.topic}
            </span>
            <span className="cmp-cell cmp-ours" role="cell">
              <i className="cmp-check" aria-hidden="true" />
              <span className="cmp-label">{cols[0]}</span>
              {fill(r.ours)}
            </span>
            {r.others.map((o, i) => (
              <span className="cmp-cell cmp-other" role="cell" key={i}>
                <span className="cmp-label">{cols[i + 1]}</span>
                {o}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p className="cmp-note fade-in">{t("note")}</p>
    </section>
  );
}
