import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LineCta from "@/components/LineCta";
import { fmt, getProduct } from "@/lib/products";
import { AI_PLANS } from "@/lib/ai-plans";

/**
 * 首頁的 AI 客服主打區塊。
 *
 * 為什麼單獨拉一個區塊，而不是讓它跟其他七項服務一起排在 ServiceCinema 裡：
 * 八個服務平均對待的結果，是沒有一個被記得。這一項有別人沒有的東西——
 * 它現在就在這一頁的右下角跑著，客人可以當場驗證。那不是文案，是證據，
 * 而證據值得一個自己的位置。
 *
 * 刻意不改 Hero 的大標：公司的傘要蓋得住另外七項服務，把首頁窄化成
 * 一家 chatbot 公司，其他服務就沒有入口了。
 */

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
      <div className="section-header fade-in">
        <div>
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>
        </div>
        <p className="section-intro">{t("lede")}</p>
      </div>

      {/* 這一塊是整個區塊的重點：別家只能給錄影，我們能給「現在就試」 */}
      <div className="ai-band-proof fade-in">
        <span className="ai-band-dot" aria-hidden="true" />
        <p>{t("proof")}</p>
      </div>

      <div className="ai-band-grid fade-in">
        {points.map((p) => (
          <div key={p.t} className="ai-band-point">
            <div className="ai-band-point-title">{p.t}</div>
            <p className="ai-band-point-desc">{p.d}</p>
          </div>
        ))}
      </div>

      <div className="ai-band-foot fade-in">
        <div className="ai-band-price">
          {t("priceLine", {
            lite: price(AI_PLANS.lite.buildSku),
            enterprise: price(AI_PLANS.enterprise.buildSku),
          })}
        </div>
        <div className="ai-band-cta">
          <Link href="/services/line-ai-chatbot" className="btn-primary">
            {t("ctaPlans")}
          </Link>
          <LineCta label={t("ctaLine")} className="btn-ghost" />
        </div>
      </div>
    </section>
  );
}
