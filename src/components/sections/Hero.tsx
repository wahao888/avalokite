import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import HeroInkCanvas from "@/components/HeroInkCanvas";
import LineCta from "@/components/LineCta";

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
      <HeroInkCanvas />
      <div className="hero-left">
        <div className="hero-label">{t("label")}</div>
        <h1 className="hero-title">
          {t("title1")}
          <span>{t("title2")}</span>
        </h1>
        <p className="hero-desc">{t("desc")}</p>
        {/* CTA 主從：免費諮詢是首頁第一順位動作，定價降為次要，
            案例與選方案測驗收成一行文字連結，避免三顆同權重按鈕互相稀釋 */}
        <div className="hero-actions">
          <LineCta label={t("ctaLine")} className="btn-primary" />
          <Link href="/pricing" className="btn-ghost">
            {t("ctaPrimary")}
          </Link>
        </div>
        <p className="hero-quiz">
          <Link href="/cases">{t("ctaGhost")}</Link>
          <span className="hero-quiz-sep" aria-hidden="true">／</span>
          <Link href="/quiz">{t("quiz")}</Link>
        </p>
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
