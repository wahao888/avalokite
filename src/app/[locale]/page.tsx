import { setRequestLocale } from "next-intl/server";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import Services from "@/components/sections/Services";
import Pricing from "@/components/sections/Pricing";
import Cases from "@/components/sections/Cases";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
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
