import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "./LogoMark";
import LineCta from "./LineCta";
import { COMPANY } from "@/lib/site";
import { SERVICES, filledCopy, servicePath } from "@/lib/services";
import { INDUSTRIES } from "@/lib/industries";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-brand">
        <div className="footer-logo">
          <LogoMark size={28} />
          <span className="footer-logo-text">AVALO</span>
        </div>
        <div className="footer-copy">
          © {year} Avalo 阿瓦羅 · {t("rights")}
          <br />
          {t("tagline")}
        </div>
        <LineCta label="LINE" className="footer-line" />
      </div>

      <div className="footer-cols">
        <div>
          <div className="footer-col-title">{t("colServices")}</div>
          {SERVICES.map((s) => (
            <Link key={s.slug} href={servicePath(s.slug)}>
              {filledCopy(s, locale).name}
            </Link>
          ))}
        </div>
        {/* 產業頁在 sitemap 與 /llms.txt 裡，卻沒有任何一頁連過去＝孤兒頁。
            Google 對站內沒人連的頁面會當成不重要，爬了也常常不收。 */}
        <div>
          <div className="footer-col-title">{t("colIndustries")}</div>
          {INDUSTRIES.map((i) => (
            <Link key={i.slug} href={`/industries/${i.slug}`}>
              {i.i18n[locale === "en" ? "en" : "zh-TW"].name}
            </Link>
          ))}
        </div>
        <div>
          <div className="footer-col-title">{t("colTools")}</div>
          <Link href="/quiz">{t("quiz")}</Link>
          <Link href="/tools/geo">{t("geoTool")}</Link>
          <Link href="/tools/cost">{t("costTool")}</Link>
          <Link href="/tools/savings">{t("savingsTool")}</Link>
          <Link href="/guides">{t("guides")}</Link>
          <Link href="/faq">{t("faq")}</Link>
          <Link href="/referral">{t("referral")}</Link>
        </div>
        <div>
          <div className="footer-col-title">{t("colCompany")}</div>
          <Link href="/about">{t("about")}</Link>
          <Link href="/cases">{t("cases")}</Link>
          <Link href="/pricing">{t("pricing")}</Link>
          <Link href="/contact">{t("contact")}</Link>
          <Link href="/legal/terms">{t("links.terms")}</Link>
          <Link href="/legal/privacy">{t("links.privacy")}</Link>
          <Link href="/legal/refund">{t("links.refund")}</Link>
          <Link href="/order/lookup">{t("links.lookup")}</Link>
        </div>
      </div>

      {/* 商家資訊：綠界收款審核要求銷售頁揭露與賣家資料一致的統編／地址／電話／Email，
          內容一律取自 COMPANY，不要在這裡手打字串。 */}
      <div className="footer-legal">
        <span className="footer-legal-name">
          {COMPANY.legalName}
          <span className="footer-legal-brand">{t("legal.brandNote")}</span>
        </span>
        <span>
          {t("legal.taxId")} {COMPANY.taxId}
        </span>
        <span>
          {t("legal.address")} {COMPANY.address}
        </span>
        <span>
          {t("legal.phone")}{" "}
          <a href={`tel:${COMPANY.phoneTel}`}>{COMPANY.phoneDisplay}</a>
        </span>
        <span>
          {t("legal.email")}{" "}
          <a href={`mailto:${COMPANY.registeredEmail}`}>{COMPANY.registeredEmail}</a>
        </span>
      </div>
    </footer>
  );
}
