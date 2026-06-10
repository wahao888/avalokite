"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";
import LogoMark from "./LogoMark";

export default function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { count } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const otherLocale = locale === "zh-TW" ? "en" : "zh-TW";

  // 首頁區塊錨點：非首頁時連回首頁對應區塊
  const anchor = (hash: string) => ({ pathname: "/", hash });

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <Link className="nav-logo" href="/">
        <LogoMark size={34} />
        <span>
          <span className="nav-logo-text">AVALO</span>{" "}
          <span className="nav-logo-sub">阿瓦羅</span>
        </span>
      </Link>
      <button
        className="nav-burger"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        MENU
      </button>
      <ul className={`nav-links${open ? " open" : ""}`}>
        <li><Link href={anchor("services")}>{t("services")}</Link></li>
        <li><Link href={anchor("pricing")}>{t("pricing")}</Link></li>
        <li><Link href={anchor("cases")}>{t("cases")}</Link></li>
        <li><Link href={anchor("about")}>{t("about")}</Link></li>
        <li><Link href={anchor("contact")}>{t("contact")}</Link></li>
        <li>
          <Link href="/cart" className="nav-cart">
            {t("cart")}
            {count > 0 && <span className="nav-cart-badge">{count}</span>}
          </Link>
        </li>
        <li>
          <Link href={anchor("pricing")} className="nav-cta">{t("cta")}</Link>
        </li>
        <li>
          <Link href={pathname} locale={otherLocale} className="lang-switch">
            {locale === "zh-TW" ? "EN" : "中文"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
