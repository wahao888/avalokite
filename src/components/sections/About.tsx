import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Feature {
  num: string;
  title: string;
  desc: string;
}

export default function About() {
  const t = useTranslations("about");
  const features = t.raw("features") as Feature[];

  return (
    <section id="about" className="about-section">
      <div className="about-left fade-in">
        <div className="mono-label">{t("label")}</div>
        <h2 className="section-title">
          {t("title1")}
          <br />
          {t("title2")}
        </h2>
        <p className="about-text">{t("p1")}</p>
        <p className="about-text">{t("p2")}</p>
        <Link
          href={{ pathname: "/", hash: "contact" }}
          className="btn-primary"
          style={{ alignSelf: "flex-start", marginTop: "1rem" }}
        >
          {t("cta")}
        </Link>
      </div>
      <div className="about-right fade-in">
        {features.map((f) => (
          <div className="feature-item" key={f.num}>
            <div className="feature-num">{f.num}</div>
            <div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
