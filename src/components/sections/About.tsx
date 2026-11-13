import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Doodle, { type DoodleName } from "@/components/Doodle";

interface Feature {
  num: string;
  title: string;
  desc: string;
}

/** 順序對應 messages 的 about.features：不二價、工程對接、部署資安、長期維護 */
const FEATURE_ICONS: DoodleName[] = ["tag", "code", "shield", "calendar"];

export default function About() {
  const t = useTranslations("about");
  const features = t.raw("features") as Feature[];

  return (
    <section id="about" className="section about-band">
      <div className="about-band-art fade-in">
        <Doodle name="heroAbout" />
      </div>
      <div className="fade-in">
        <div className="mono-label">{t("label")}</div>
        <h2 className="section-title">
          {t("title1")}
          <br />
          {t("title2")}
        </h2>
        <p className="section-intro">{t("p1")}</p>
        <ul className="about-band-grid">
          {features.map((f, i) => (
            <li key={f.num}>
              <Doodle name={FEATURE_ICONS[i] ?? "check"} size={48} />
              <div>
                <div className="ai-point-t">{f.title}</div>
                <p className="ai-point-d">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/contact" className="btn-primary">{t("cta")}</Link>
      </div>
    </section>
  );
}
