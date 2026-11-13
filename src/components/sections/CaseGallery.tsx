import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import InkWash from "@/components/InkWash";

/**
 * 案例拼貼牆
 *
 * 首頁只負責「讓人看到真的做過」：六張真機截圖排成拼貼，第一張放大，
 * 每張只留類型與名字，說明交給案例頁。原本的橫向捲動長廊每張還帶一句說明，
 * 而且一次只看得到四張半。
 */

/** 精選順序：第一張是大圖，放最能代表「完全客製」的財務系統 */
const FEATURED = ["finance", "rekat", "monsieurlong", "wenshan", "formula-kart", "gtclub"];

interface CaseItem {
  id: string;
  type: string;
  name: string;
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

      <ul className="mosaic fade-in">
        {featured.map((item, i) => {
          const inner = (
            <>
              <img
                src={`/cases/${item.id}.jpg`}
                alt={item.name}
                width={1200}
                height={750}
                loading={i < 3 ? "eager" : "lazy"}
              />
              <span className="mosaic-cap">
                <span className="mosaic-type">{item.type}</span>
                <span className="mosaic-name">{item.name}</span>
              </span>
            </>
          );
          return (
            <li key={item.id} className={i === 0 ? "is-big" : undefined}>
              {item.url.startsWith("/cases/") ? (
                <Link className="mosaic-card" href={item.url}>{inner}</Link>
              ) : (
                <a className="mosaic-card" href={item.url} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <div className="gallery-foot fade-in">
        <Link href="/cases" className="btn-ghost">{t("seeAll", { n: items.length })}</Link>
      </div>
    </section>
  );
}
