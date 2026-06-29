import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";

export default function Contact() {
  const t = useTranslations("contact");

  return (
    <section id="contact" className="section" style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ marginBottom: "4rem" }} className="fade-in">
        <div className="mono-label">{t("label")}</div>
        <h2 className="section-title">
          {t("title1")}
          <br />
          {t("title2")}
        </h2>
      </div>
      <div className="contact-grid">
        <div className="fade-in">
          <p className="contact-intro">{t("intro")}</p>
        </div>
        <div className="fade-in">
          <ContactForm />
          <div className="form-footnote">
            <div className="form-footnote-item">
              <span className="form-footnote-label">{t("items.hours")}</span>
              <span className="form-footnote-value">{t("items.hoursValue")}</span>
            </div>
            <div className="form-footnote-item">
              <span className="form-footnote-label">{t("items.schedule")}</span>
              <span className="form-footnote-value">{t("items.scheduleValue")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
