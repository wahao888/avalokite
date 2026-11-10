import { useTranslations } from "next-intl";
import LineCta from "@/components/LineCta";
import InkWash from "@/components/InkWash";

/**
 * 合作四步圖解
 *
 * 高單價客戶在下單前最想知道的是「開始之後會發生什麼事」。這件事原本散在
 * 關於與聯絡區的段落裡，改成一條有時間標示的圖解，每一步都寫清楚要多久。
 */

interface Step {
  num: string;
  name: string;
  desc: string;
  meta: string;
}

const STEP_ICONS: React.ReactNode[] = [
  <path key="a" d="M21 15a2 2 0 0 1-2 2H7.5L3.5 21V5.5a2 2 0 0 1 2-2h13.5a2 2 0 0 1 2 2z" />,
  <g key="b">
    <path d="M14 2.8H6.5a2 2 0 0 0-2 2v14.4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.3z" />
    <path d="M14 2.8v5.5h5.5M8.5 13h7M8.5 16.5h4.5" />
  </g>,
  <path key="c" d="M8.5 7 3 12l5.5 5M15.5 7l5.5 5-5.5 5" />,
  <g key="d">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 12.3l2.4 2.4 4.6-5.2" />
  </g>,
];

export default function Process() {
  const t = useTranslations("process");
  const steps = t.raw("steps") as Step[];

  return (
    <section id="process" className="section process-section">
      <InkWash variant={3} />
      <div className="section-header fade-in">
        <div>
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>
        </div>
        <p className="section-intro">{t("intro")}</p>
      </div>

      <ol className="process-grid fade-in">
        {steps.map((step, i) => (
          <li className="process-step" key={step.num}>
            <div className="process-num">{step.num}</div>
            <svg
              className="process-icon"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {STEP_ICONS[i] ?? STEP_ICONS[0]}
            </svg>
            <h3 className="process-name">{step.name}</h3>
            <p className="process-desc">{step.desc}</p>
            <div className="process-meta">{step.meta}</div>
          </li>
        ))}
      </ol>

      <div className="process-cta fade-in">
        <p className="process-cta-text">{t("ctaText")}</p>
        <LineCta label={t("cta")} />
      </div>
    </section>
  );
}
