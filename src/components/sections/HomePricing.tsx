import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Doodle, { type DoodleName } from "@/components/Doodle";
import PromoPlans from "@/components/sections/PromoPlans";
import { fmt, getProduct } from "@/lib/products";
import type { Locale } from "@/i18n/routing";

/**
 * 首頁的定價：限時方案＋四張最常選的價格卡，其餘交給 /pricing。
 *
 * 首頁原本直接放整個定價區（三個分頁、二十多張方案卡、加購清單與客製報價），
 * 光這一段就將近四千像素、兩千多字，比首頁其他區塊加起來還長。
 * 完整價目一直都在 /pricing，首頁只需要讓人知道「大概多少錢」。
 */

/** 四張都是該類的入門價，所以一律標「起」 */
const TILES: { sku: string; icon: DoodleName }[] = [
  { sku: "web-basic", icon: "browser" },
  { sku: "web-commerce", icon: "cart" },
  { sku: "ai-chatbot-lite", icon: "chat" },
  { sku: "care-basic", icon: "shield" },
];

export default function HomePricing() {
  const t = useTranslations("pricing");
  const locale = useLocale() as Locale;
  const zh = locale !== "en";

  return (
    <section id="pricing" className="section pricing-section">
      <div className="section-header fade-in">
        <div>
          <div className="mono-label">{t("label")}</div>
          <h2 className="section-title">
            {t("title1")}
            <br />
            {t("title2")}
          </h2>
        </div>
        <p className="section-intro">{t("homeIntro")}</p>
      </div>

      <PromoPlans compact />

      <ul className="hp-grid fade-in">
        {TILES.map(({ sku, icon }) => {
          const p = getProduct(sku);
          if (!p) throw new Error(`首頁定價引用了不存在的方案：${sku}`);
          return (
            <li key={sku}>
              <Link href="/pricing" className="hp-tile">
                <Doodle name={icon} size={56} />
                <span className="hp-name">{p.i18n[locale].name}</span>
                {/* 「起」直接接在價格後面讀；英文是 from 放前面 */}
                <span className="hp-price">
                  {!zh && <small className="hp-from">{t("homeFrom")}</small>}
                  <small>NT$</small>
                  {fmt(p.price)}
                  {p.type === "monthly" && <small>{t("perMonth")}</small>}
                  {zh && <small className="hp-from">{t("homeFrom")}</small>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hs-foot fade-in">
        <Link href="/pricing" className="btn-primary">{t("homeAll")}</Link>
      </div>
    </section>
  );
}
