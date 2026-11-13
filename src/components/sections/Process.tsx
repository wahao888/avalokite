import { useTranslations } from "next-intl";
import LineCta from "@/components/LineCta";
import InkWash from "@/components/InkWash";
import Doodle, { type DoodleName } from "@/components/Doodle";

/**
 * 合作四步圖解
 *
 * 高單價客戶在下單前最想知道的是「開始之後會發生什麼事」。每一步只留
 * 一張圖、一個名字、要多久——名字本身已經說明在做什麼。
 */

interface Step {
  num: string;
  name: string;
  meta: string;
}

/** 順序對應 messages 的 process.steps：諮詢、書面報價、設計開發、上線 */
const STEP_ICONS: DoodleName[] = ["chat", "seal", "pencil", "rocket"];

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

      <ol className="ip-flow is-4 fade-in">
        {steps.map((step, i) => (
          <li className="ip-step" key={step.num}>
            <span className="ip-step-num">{step.num}</span>
            <Doodle name={STEP_ICONS[i] ?? "check"} size={64} className="ip-step-icon" />
            <h3 className="ip-step-t">{step.name}</h3>
            <p className="process-meta">{step.meta}</p>
            <Doodle name="arrow" className="ip-step-arrow" />
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
