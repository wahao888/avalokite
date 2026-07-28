import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface CaseItem {
  id: string;
  category: string;
  type: string;
  year: string;
  name: string;
  label: string;
  desc: string;
  tags: string[];
  url: string;
}

interface CaseCategory {
  id: string;
  name: string;
  hint: string;
}

export default function Cases() {
  const t = useTranslations("cases");
  const items = t.raw("items") as CaseItem[];
  const categories = t.raw("categories") as CaseCategory[];

  const renderBody = (item: CaseItem) => (
    <div className="case-body">
      <div className="case-meta">
        <span className="case-type">{item.type}</span>
        <span className="case-year">{item.year}</span>
      </div>
      <div className="case-name">{item.name}</div>
      <p className="case-desc">{item.desc}</p>
      <div className="case-tags">
        {item.tags.map((tag) => (
          <span className="tag" key={tag}>{tag}</span>
        ))}
      </div>
      {item.url.startsWith("/cases/") ? (
        // 站內案例介紹頁
        <Link href={item.url} className="case-link">
          {t("viewCase")}
        </Link>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="case-link">
          {t("visit")}
        </a>
      )}
    </div>
  );

  return (
    <section id="cases" className="section" style={{ borderTop: "1px solid var(--border)" }}>
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

      {categories.map((cat) => {
        const group = items.filter((i) => i.category === cat.id);
        if (group.length === 0) return null;
        return (
          <div key={cat.id} className="cases-group fade-in">
            <div className="cases-cat">
              <h3 className="cases-cat-name">{cat.name}</h3>
              <span className="cases-cat-hint">{cat.hint}</span>
            </div>
            <div className="cases-grid">
              {group.map((item, idx) => (
                <div
                  className={`case-card${idx === 0 && group.length % 2 === 1 ? " case-wide" : ""}`}
                  key={item.id}
                >
                  <div className={`case-img brand-${item.id}`}>
                    <img src={`/cases/${item.id}.jpg`} alt={item.name} loading="lazy" />
                  </div>
                  {renderBody(item)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
