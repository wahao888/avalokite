import { getTranslations, setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import Services from "@/components/sections/Services";
import Pricing from "@/components/sections/Pricing";
import Cases from "@/components/sections/Cases";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
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
      <Hero />
      <Ticker />
      <Services />
      <Pricing />
      <Cases />
      <About />
      <Contact />
    </main>
  );
}
