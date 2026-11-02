import { useLocale, useTranslations } from "next-intl";
import ContactForm from "@/components/ContactForm";
import LineCta from "@/components/LineCta";
import TrustMarks from "@/components/TrustMarks";
import { SITE } from "@/lib/site";

export default function Contact({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const Title = heading;

  return (
    <section id="contact" className="section" style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ marginBottom: "4rem" }} className="fade-in">
        <div className="mono-label">{t("label")}</div>
        <Title className="section-title">
          {t("title1")}
          <br />
          {t("title2")}
        </Title>
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
              <span className="form-footnote-label">{t("items.line")}</span>
              <span className="form-footnote-value">{SITE.lineId}</span>
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
          <div style={{ marginTop: "1.5rem" }}>
            <LineCta label={t("lineCta")} />
          </div>
          <TrustMarks locale={locale} />
        </div>
        <div className="fade-in">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
