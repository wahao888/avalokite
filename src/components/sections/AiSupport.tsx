import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LineCta from "@/components/LineCta";
import Doodle, { type DoodleName } from "@/components/Doodle";
import { fmt, getProduct } from "@/lib/products";
import { AI_PLANS } from "@/lib/ai-plans";

/**
 * 首頁的 AI 客服主打區塊。
 *
 * 為什麼單獨拉一個區塊，而不是跟其他七項服務一起排在服務格裡：
 * 八個服務平均對待的結果，是沒有一個被記得。這一項有別人沒有的東西——
 * 它現在就在這一頁的右下角跑著，客人可以當場驗證。
 *
 * 版面是左圖右文：深夜裡的手機、客人問、機器人答，一張圖先把「下班後也有人回」
 * 講完，右邊三點各只留一句。
 */

/** 三個重點的圖示，順序對應 messages 的 aiBand.points */
const POINT_ICONS: DoodleName[] = ["folder", "calc", "handoff"];

const price = (sku: string) => {
  const p = getProduct(sku);
  if (!p) throw new Error(`aiBand 引用了不存在的方案：${sku}`);
  return `NT$${fmt(p.price)}`;
};

export default function AiSupport() {
  const t = useTranslations("aiBand");
  const points = t.raw("points") as { t: string; d: string }[];

  return (
    <section id="ai-support" className="section ai-band">
      <div className="ai-split">
        <div className="ai-art fade-in">
          <Doodle name="heroChat" />
        </div>

        <div className="fade-in">
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>

          {/* 這一行是整個區塊的重點：別家只能給錄影，我們能給「現在就試」 */}
          <p className="ai-band-proof">
            <span className="ai-band-dot" aria-hidden="true" />
            {t("proof")}
          </p>

          <ul className="ai-points">
            {points.map((p, i) => (
              <li key={p.t}>
                <Doodle name={POINT_ICONS[i] ?? "check"} size={48} />
                <div>
                  <div className="ai-point-t">{p.t}</div>
                  <p className="ai-point-d">{p.d}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="ai-band-price">
            {t("priceLine", {
              lite: price(AI_PLANS.lite.buildSku),
              enterprise: price(AI_PLANS.enterprise.buildSku),
            })}
          </p>
          <div className="ai-band-cta">
            <Link href="/services/line-ai-chatbot" className="btn-primary">
              {t("ctaPlans")}
            </Link>
            <LineCta label={t("ctaLine")} className="btn-ghost" />
          </div>
        </div>
      </div>
    </section>
  );
}
