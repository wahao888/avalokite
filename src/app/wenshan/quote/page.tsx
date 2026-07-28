import type { Metadata } from "next";
import { SITE } from "../_data/site";
import QuoteForm from "../_components/QuoteForm";

export const metadata: Metadata = {
  title: "線上估價",
  description:
    "文山木材行線上估價：選場域、勾材料、留聯絡方式，營業時間內回覆報價。雙北工地免費配送。",
};

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const { venue } = await searchParams;

  return (
    <main>
      <div className="ws-wrap ws-page-head">
        <p className="ws-eyebrow">Quote</p>
        <h1 className="ws-h2">線上估價</h1>
        <p className="ws-lede">
          三個步驟，三分鐘填完。不確定的欄位跳過就好——講不清楚的，黃老闆會打電話跟你確認。
        </p>
      </div>

      <div className="ws-wrap ws-quote" style={{ paddingBottom: 80 }}>
        <QuoteForm initialVenue={venue} />
        <aside className="ws-quote-aside">
          <div className="ws-infocard">
            <h3>不想打字？</h3>
            <dl>
              <div>
                <dt>直接來電</dt>
                <dd>
                  <a href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>
                </dd>
              </div>
              <div>
                <dt>營業時間</dt>
                <dd>{SITE.hoursDisplay}</dd>
              </div>
              <div>
                <dt>來店看料</dt>
                <dd>
                  <a href={SITE.mapsUrl} target="_blank" rel="noopener noreferrer">
                    {SITE.addressFull}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
          <div className="ws-infocard">
            <h3>小提醒</h3>
            <ul className="ws-ul" style={{ fontSize: 14 }}>
              <li>雙北工地免費配送，出車週二至週六。</li>
              <li>料單、圖面內容直接貼在備註即可。</li>
              <li>送出後不會產生任何費用。</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
