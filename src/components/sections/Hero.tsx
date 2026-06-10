import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Stat {
  num: string;
  suffix: string;
  label: string;
}

export default function Hero() {
  const t = useTranslations("hero");
  const stats = t.raw("stats") as Stat[];

  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-label">{t("label")}</div>
        <h1 className="hero-title">
          {t("title1")}
          <span>{t("title2")}</span>
        </h1>
        <p className="hero-desc">{t("desc")}</p>
        <div className="hero-actions">
          <Link href={{ pathname: "/", hash: "pricing" }} className="btn-primary">
            {t("ctaPrimary")}
          </Link>
          <Link href={{ pathname: "/", hash: "cases" }} className="btn-ghost">
            {t("ctaGhost")}
          </Link>
        </div>
        <div className="scroll-line">
          <span className="scroll-text">{t("scroll")}</span>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-grid-bg" />
        {/* 放大的年輪標誌作為背景裝飾 */}
        <svg
          className="hero-rings"
          width="540"
          height="540"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <g transform="translate(32,33)">
            <circle
              r="26" fill="none" stroke="#A98467" strokeWidth="0.6" strokeLinecap="round"
              strokeDasharray="100 16 36 12" transform="rotate(-30)" opacity="0.55"
            />
            <circle
              r="20" fill="none" stroke="#8A9A7B" strokeWidth="0.6" strokeLinecap="round"
              strokeDasharray="52 12 46 18" transform="rotate(40)" opacity="0.5"
            />
            <circle
              r="14" fill="none" stroke="#A98467" strokeWidth="0.6" strokeLinecap="round"
              strokeDasharray="56 10 16 7" transform="rotate(160)" opacity="0.4"
            />
          </g>
        </svg>
        <div className="hero-stats fade-in visible">
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num">
                {s.num}
                <span>{s.suffix}</span>
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
