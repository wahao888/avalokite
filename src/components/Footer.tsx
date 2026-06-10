import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "./LogoMark";

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
    </footer>
  );
}
