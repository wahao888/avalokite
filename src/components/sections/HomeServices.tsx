import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Doodle from "@/components/Doodle";
import { SERVICE_CARDS, cardPriceLabel } from "@/lib/service-cards";
import { getService, servicePath } from "@/lib/services";

/**
 * 首頁的八項服務：一張圖、一個名字、一個價格。
 *
 * 原本是深色的捲動分鏡（三段服務、每段六個流程節點加說明），整個區塊兩千多像素高、
 * 六百多字，讀完才知道公司做哪幾件事。改成圖示格之後，一個畫面就看完八項，
 * 細節交給各服務頁。卡片資料與服務索引頁共用 src/lib/service-cards.ts。
 */
export default function HomeServices() {
  const t = useTranslations("services");
  const zh = useLocale() !== "en";
  const loc = zh ? "zh-TW" : "en";

  return (
    <section id="services" className="section hs-section">
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

      <ul className="hs-grid fade-in">
        {SERVICE_CARDS.map((c) => {
          const s = getService(c.slug);
          if (!s) throw new Error(`首頁服務格引用了不存在的服務：${c.slug}`);
          const price = cardPriceLabel(c, zh);
          return (
            <li key={c.slug}>
              <Link href={servicePath(c.slug)} className="hs-tile">
                <Doodle name={c.icon} className="hs-icon" />
                <h3 className="hs-name">{s.i18n[loc].name}</h3>
                <span className="hs-price">
                  {price.amount}
                  <small>{price.suffix}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hs-foot fade-in">
        <Link href="/services" className="btn-ghost">{t("all")}</Link>
      </div>
    </section>
  );
}
