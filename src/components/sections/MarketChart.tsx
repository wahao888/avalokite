import { useLocale, useTranslations } from "next-intl";
import { fmt, PRODUCTS } from "@/lib/products";
import type { Locale } from "@/i18n/routing";
import InkWash from "@/components/InkWash";

/**
 * 行情對照圖表
 *
 * 同一組數字原本是定價卡底下的一行小字（「市場行情 NT$100,000–500,000」），
 * 沒人會去換算。畫成橫條之後，Avalo 的價格線直接標在行情區間上，
 * 便宜多少一眼就看得出來 —— AI 客服那條甚至落在區間左側之外。
 */

/** 橫軸上限，四個對照方案的行情高點最大就是 50 萬 */
const AXIS_MAX = 500_000;
const pct = (n: number) => (n / AXIS_MAX) * 100;

export default function MarketChart() {
  const t = useTranslations("market");
  const locale = useLocale() as Locale;
  const rows = PRODUCTS.filter((p) => p.marketBand);
  const ticks = t.raw("ticks") as string[];

  return (
    <section id="market" className="section market-section">
      <InkWash variant={2} />
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

      <div className="market-chart fade-in">
        {rows.map((p) => {
          const band = p.marketBand!;
          return (
            <div className="market-row" key={p.sku}>
              <div className="market-name">
                {p.i18n[locale].name}
                <span className="market-unit">{p.i18n[locale].unit}</span>
              </div>
              <div className="market-track">
                <div
                  className="market-band"
                  style={{ left: `${pct(band.low)}%`, width: `${pct(band.high - band.low)}%` }}
                  title={`NT$${fmt(band.low)}–${fmt(band.high)}`}
                />
                <div className="market-mark" style={{ left: `${pct(p.price)}%` }}>
                  <span className="market-mark-label">NT${fmt(p.price)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="market-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>

      <div className="market-legend fade-in">
        <span className="market-legend-item">
          <i className="market-legend-band" aria-hidden="true" />
          {t("legendRange")}
        </span>
        <span className="market-legend-item">
          <i className="market-legend-mark" aria-hidden="true" />
          {t("legendOurs")}
        </span>
      </div>
    </section>
  );
}
