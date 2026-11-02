import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import CostCalc from "@/components/CostCalc";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/tools/cost",
    title: zh ? "網站建置費用試算｜第一年總成本｜Avalo 阿瓦羅" : "Website cost calculator | Year-one total | Avalo",
    description: zh
      ? "用公開標價加總形象官網或商務網站加維護 12 個月。這是試算，不是報價。"
      : "Add published prices for a brand or commerce site plus 12 months of care. An estimate, not a quote.",
  });
}

export default async function CostToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "費用試算" : "Cost calculator", path: "/tools/cost" },
        ])}
      />
      <div className="mono-label">COST</div>
      <h1 className="section-title">{zh ? "網站建置費用試算" : "Website cost calculator"}</h1>
      <p className="fa-lede">
        {zh
          ? "數字來自定價頁的標準方案。客製範圍、文案未齊、特殊串接都不在這裡。"
          : "Numbers come from the standard plans. Custom scope is not in this form."}
      </p>
      <CostCalc />
    </main>
  );
}
