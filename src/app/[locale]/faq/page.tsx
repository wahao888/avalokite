import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import { breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";
import { SITE_FAQ } from "@/lib/faq";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/faq",
    title: zh ? "常見問題｜價格、交期、維護、網域｜Avalo 阿瓦羅" : "FAQ | Price, timeline, care, domain | Avalo",
    description: zh
      ? "形象官網多少錢、維護為什麼要綁、網域在誰名下、AI 客服會不會亂報價。"
      : "What a brand site costs, why care is required, whose name the domain is in, and whether the AI invents quotes.",
  });
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const items = SITE_FAQ[zh ? "zh-TW" : "en"];
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <JsonLd data={faqLd(items)} />
      <div className="mono-label">FAQ</div>
      <h1 className="section-title">{zh ? "常見問題" : "FAQ"}</h1>
      <FaqList items={items} />
    </main>
  );
}
