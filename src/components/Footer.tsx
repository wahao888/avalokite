import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "./LogoMark";
import { COMPANY } from "@/lib/site";

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-logo">
        <LogoMark size={28} />
        <span className="footer-logo-text">AVALO</span>
      </div>
      <div className="footer-copy">
        © {year} Avalo 阿瓦羅 · {t("rights")}
        <br />
        {t("tagline")}
      </div>
      <div className="footer-links">
        <Link href="/legal/terms">{t("links.terms")}</Link>
        <Link href="/legal/privacy">{t("links.privacy")}</Link>
        <Link href="/legal/refund">{t("links.refund")}</Link>
        <Link href="/order/lookup">{t("links.lookup")}</Link>
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
