import { useTranslations } from "next-intl";

interface CaseItem {
  id: string;
  type: string;
  year: string;
  name: string;
  label: string;
  desc: string;
  tags: string[];
  url: string;
}

export default function Cases() {
  const t = useTranslations("cases");
  const items = t.raw("items") as CaseItem[];
  const [first, ...rest] = items;

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
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="case-link">
        {t("visit")}
      </a>
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

      <div className="cases-grid fade-in">
        <div className="case-card case-wide">
          <div className={`case-img brand-${first.id}`}>
            <span className="case-img-label">{first.label}</span>
          </div>
          {renderBody(first)}
        </div>
        {rest.map((item) => (
          <div className="case-card" key={item.id}>
            <div className={`case-img brand-${item.id}`}>
              <span className="case-img-label">{item.label}</span>
            </div>
            {renderBody(item)}
          </div>
        ))}
      </div>
    </section>
  );
}
