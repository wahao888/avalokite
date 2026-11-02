import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface ServiceItem {
  num: string;
  name: string;
  desc: string;
  tags: string[];
  href: string;
}

export default function Services() {
  const t = useTranslations("services");
  const items = t.raw("items") as ServiceItem[];

  return (
    <section id="services" className="section services-section">
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
      <div className="services-grid fade-in">
        {items.map((item) => (
          <Link className="service-card" key={item.num} href={item.href}>
            <div className="service-num">{item.num}</div>
            <div className="service-name">{item.name}</div>
            <p className="service-desc">{item.desc}</p>
            <div className="service-tags">
              {item.tags.map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
