import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { GUIDES } from "@/lib/guides";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/guides",
    title: zh ? "指南｜網站費用、GEO、LINE AI、綠界｜Avalo 阿瓦羅" : "Guides | Cost, GEO, LINE AI, ECPay | Avalo",
    description: zh
      ? "第一手經驗：架站費用、維護、GEO、LINE AI 客服防線、綠界審核與定期定額。"
      : "First-hand notes on cost, care, GEO, LINE AI guardrails, and ECPay review.",
  });
}

export default async function GuidesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const loc = zh ? "zh-TW" : "en";
  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "指南" : "Guides", path: "/guides" },
        ])}
      />
      <div className="mono-label">GUIDES</div>
      <h1 className="section-title">{zh ? "指南" : "Guides"}</h1>
      <p className="section-intro" style={{ marginBottom: "2rem" }}>
        {zh
          ? "只寫我們做過、踩過的事。沒有保證排名，也沒有大量產文。"
          : "Only things we have shipped or been burned by. No ranking promises, no bulk copy."}
      </p>
      <ul className="guide-index">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`}>
              <span className="form-note">{g.date}</span>
              <strong>{g.i18n[loc].title}</strong>
              <p>{g.i18n[loc].description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
