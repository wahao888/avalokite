import { getTranslations, setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import TrustMarks from "@/components/TrustMarks";
import Pricing from "@/components/sections/Pricing";
import { breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";
import { SITE_FAQ } from "@/lib/faq";
import { fmt, getProduct } from "@/lib/products";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  const basic = getProduct("web-basic")!;
  return pageMetadata({
    locale,
    path: "/pricing",
    title: zh
      ? `網頁設計價格｜形象官網 NT$${fmt(basic.price)} 起・價格全公開｜Avalo 阿瓦羅`
      : `Web Design Pricing | Brand sites from NT$${fmt(basic.price)} | Avalo`,
    description: zh
      ? "形象官網、商務網站、AI 客服與維護月費全部公開。可線上下單，結帳加 5% 營業稅。"
      : "Brand sites, commerce, AI support and care plans — all published. Order online; 5% VAT at checkout.",
  });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const t = await getTranslations({ locale, namespace: "pricing" });
  const faq = SITE_FAQ[zh ? "zh-TW" : "en"];
  const basic = getProduct("web-basic")!;
  const care = getProduct("care-basic")!;
  const year = basic.price + care.price * 12;

  return (
    <main>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "定價" : "Pricing", path: "/pricing" },
        ])}
      />
      <JsonLd data={faqLd(faq)} />
      <div className="page-wrap" style={{ paddingBottom: 0 }}>
        <div className="mono-label">PRICING</div>
        <h1 className="section-title">{t("title1")}<br />{t("title2")}</h1>
        <p className="fa-lede">
          {zh
            ? `形象官網第一年未稅大約 NT$${fmt(year)}（建置 ${fmt(basic.price)} ＋ 安心維護 12 個月）。維護自驗收通過才開始計。`
            : `A brand site is about NT$${fmt(year)} excl. VAT in year one (build ${fmt(basic.price)} + 12 months of Essential Care). Care starts after acceptance.`}
        </p>
        <TrustMarks locale={locale} />
        <p className="form-note" style={{ margin: "1.5rem 0 0" }}>
          <Link href="/quiz">{zh ? "不確定選哪個？三題幫你挑方案 →" : "Not sure? Three questions to pick a plan →"}</Link>
          {" · "}
          <Link href="/tools/cost">{zh ? "費用試算" : "Cost calculator"}</Link>
        </p>
      </div>
      <Pricing />
      <section className="section">
        <h2 className="fa-h2">{zh ? "常見問題" : "FAQ"}</h2>
        <FaqList items={faq} />
      </section>
    </main>
  );
}
