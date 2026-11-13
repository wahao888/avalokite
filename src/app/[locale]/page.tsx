import { getTranslations, setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import AiSupport from "@/components/sections/AiSupport";
import HomeServices from "@/components/sections/HomeServices";
import CaseGallery from "@/components/sections/CaseGallery";
import MarketChart from "@/components/sections/MarketChart";
import HomePricing from "@/components/sections/HomePricing";
import Process from "@/components/sections/Process";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import InkParallax from "@/components/InkParallax";
import JsonLd from "@/components/JsonLd";
import { homeGraphLd, pageMetadata } from "@/lib/seo";

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

  return (
    <main>
      <JsonLd data={homeGraphLd(locale, t("description"))} />
      {/* 常見問題的結構化標記只放在真的有顯示常見問題的頁面（/pricing、/faq）：
          Google 要求標記對應看得到的內容，首頁沒有常見問題區塊。 */}
      <InkParallax />
      <Hero />
      <Ticker />
      {/* 主打項排在服務分鏡之前：它是唯一一個客人能在這一頁當場驗證的服務 */}
      <AiSupport />
      {/* 看懂在做什麼 → 相信做得到 → 知道價格在哪 → 知道怎麼開始 → 聯絡 */}
      <HomeServices />
      <CaseGallery />
      <MarketChart />
      <HomePricing />
      <Process />
      <About />
      <Contact />
    </main>
  );
}
