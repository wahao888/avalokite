import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import InkWash from "@/components/InkWash";

/**
 * 案例長廊
 *
 * 首頁原本把九個案例全部直式展開、每個一百多字，是第二長的區塊。
 * 這裡只露精選五件、改成橫向捲動的真機大圖，文字砍成一句話；
 * 想看細節的人點進案例頁，首頁不再承擔說明責任。
 */

/** 精選順序：先放最能代表「完全客製」的財務系統，再放三個品牌官網與一個互動案例 */
const FEATURED = ["finance", "rekat", "monsieurlong", "wenshan", "formula-kart"];

interface CaseItem {
  id: string;
  type: string;
  year: string;
  name: string;
  short: string;
  url: string;
}

export default function CaseGallery() {
  const t = useTranslations("cases");
  const items = t.raw("items") as CaseItem[];
  const byId = new Map(items.map((i) => [i.id, i]));
  const featured = FEATURED.map((id) => byId.get(id)).filter(Boolean) as CaseItem[];

  return (
    <section id="cases" className="section gallery-section">
      <InkWash variant={1} />
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

      <div className="gallery-rail fade-in">
        {featured.map((item) => {
          const inner = (
            <>
              <div className="gallery-shot">
                <img src={`/cases/${item.id}.jpg`} alt={item.name} loading="lazy" />
              </div>
              <div className="gallery-meta">
                <div className="gallery-type">
                  {item.type}
                  <span className="gallery-year">{item.year}</span>
                </div>
                <h3 className="gallery-name">{item.name}</h3>
                <p className="gallery-short">{item.short}</p>
                <span className="gallery-link">{t("viewCase")}</span>
              </div>
            </>
          );
          return item.url.startsWith("/cases/") ? (
            <Link className="gallery-card" key={item.id} href={item.url}>
              {inner}
            </Link>
          ) : (
            <a
              className="gallery-card"
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          );
        })}
      </div>

      <div className="gallery-foot fade-in">
        <span className="gallery-hint">{t("scrollHint")}</span>
        <Link href="/cases" className="btn-ghost">{t("seeAll")}</Link>
      </div>
    </section>
  );
}
