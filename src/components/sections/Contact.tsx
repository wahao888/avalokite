import { useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

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
          <div className="form-footnote">
            {/* 對外主要聯絡管道用品牌信箱；公司登記資料在頁尾的商家資訊 */}
            <div className="form-footnote-item">
              <span className="form-footnote-label">{t("items.email")}</span>
              <span className="form-footnote-value">
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </span>
            </div>
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
        <div className="fade-in">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
