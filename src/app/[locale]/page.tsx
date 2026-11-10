import { getTranslations, setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import ServiceCinema from "@/components/sections/ServiceCinema";
import CaseGallery from "@/components/sections/CaseGallery";
import MarketChart from "@/components/sections/MarketChart";
import Pricing from "@/components/sections/Pricing";
import Process from "@/components/sections/Process";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import InkParallax from "@/components/InkParallax";
import JsonLd from "@/components/JsonLd";
import { faqLd, homeGraphLd, pageMetadata } from "@/lib/seo";
import { SITE_FAQ } from "@/lib/faq";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/", title: t("title"), description: t("description") });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  const faq = SITE_FAQ[locale === "en" ? "en" : "zh-TW"];

  return (
    <main>
      <JsonLd data={homeGraphLd(locale, t("description"))} />
      <JsonLd data={faqLd(faq)} />
      <InkParallax />
      <Hero />
      <Ticker />
      {/* 看懂在做什麼 → 相信做得到 → 知道價格在哪 → 知道怎麼開始 → 聯絡 */}
      <ServiceCinema />
      <CaseGallery />
      <MarketChart />
      <Pricing />
      <Process />
      <About />
      <Contact />
    </main>
  );
}
