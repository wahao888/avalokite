import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import Cases from "@/components/sections/Cases";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/cases",
    title: zh ? "案例｜全部都是上線中的真實網站｜Avalo 阿瓦羅" : "Work | Live sites, no mockups | Avalo",
    description: zh
      ? "隆先生、REKAT、文山木材行等實際開發、正在線上的作品。不放概念稿。"
      : "Monsieur Long, REKAT, Wenshan Lumber and others — built by Avalo and running. No mockups.",
  });
}

export default async function CasesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "案例" : "Work", path: "/cases" },
        ])}
      />
      <Cases heading="h1" />
    </main>
  );
}
