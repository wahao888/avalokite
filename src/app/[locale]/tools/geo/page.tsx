import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import GeoChecker from "@/components/GeoChecker";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/tools/geo",
    title: zh ? "免費 AI 能見度檢測｜robots、JSON-LD、llms.txt｜Avalo" : "Free AI visibility check | robots, JSON-LD, llms.txt | Avalo",
    description: zh
      ? "檢查網站有沒有擋 AI 爬蟲、有沒有結構化資料與 llms.txt。不保證 ChatGPT 會推薦你。"
      : "Check whether AI crawlers are blocked, and whether JSON-LD and llms.txt exist. No citation promises.",
  });
}

export default async function GeoToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "AI 能見度檢測" : "AI visibility check", path: "/tools/geo" },
        ])}
      />
      <div className="mono-label">GEO CHECK</div>
      <h1 className="section-title">{zh ? "AI 能見度檢測" : "AI visibility check"}</h1>
      <p className="fa-lede">
        {zh
          ? "只檢查爬得到、讀得懂的地基：robots.txt、JSON-LD、llms.txt。不會拿你的網址去問 ChatGPT——那會花模型費用，也無法保證結果。"
          : "This checks the crawlable foundation: robots.txt, JSON-LD, llms.txt. It does not query ChatGPT with your URL."}
      </p>
      <GeoChecker />
      <p className="form-note" style={{ marginTop: "1.5rem" }}>
        <Link href="/services/geo">{zh ? "需要書面健檢與改善 →" : "Need a written audit →"}</Link>
      </p>
    </main>
  );
}
