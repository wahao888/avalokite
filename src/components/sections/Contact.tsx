import { useTranslations } from "next-intl";
import { SITE } from "@/lib/site";
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
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <div>
              <div className="contact-label">{t("items.email")}</div>
              <div className="contact-value">{SITE.email}</div>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">💬</span>
            <div>
              <div className="contact-label">{t("items.line")}</div>
              <div className="contact-value">{SITE.lineId}</div>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">⏰</span>
            <div>
              <div className="contact-label">{t("items.hours")}</div>
              <div className="contact-value">{t("items.hoursValue")}</div>
            </div>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📅</span>
            <div>
              <div className="contact-label">{t("items.schedule")}</div>
              <div className="contact-value">{t("items.scheduleValue")}</div>
            </div>
          </div>
        </div>
        <div className="fade-in">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
