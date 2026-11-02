import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { SERVICES, filledCopy, servicePath } from "@/lib/services";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/services",
    title: zh ? "服務項目｜網頁設計、電商、LINE AI 客服、GEO｜Avalo 阿瓦羅" : "Services | Web design, commerce, LINE AI, GEO | Avalo",
    description: zh
      ? "形象官網、商務網站、LINE AI 客服、企業自動化、GEO、維護與金流。價格公開，可線上下單。"
      : "Brand sites, commerce, LINE AI support, automation, GEO, care and payments. Published prices, order online.",
  });
}

export default async function ServicesIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "服務" : "Services", path: "/services" },
        ])}
      />
      <div className="mono-label">SERVICES</div>
      <h1 className="section-title">{zh ? "服務項目" : "Services"}</h1>
      <p className="section-intro" style={{ marginBottom: "2.5rem" }}>
        {zh
          ? "每一項都有公開價格、交期與 FAQ。標準方案可線上下單；超出範圍走免費諮詢。"
          : "Each service has a published price, a timeline and an FAQ. Standard plans can be ordered online."}
      </p>
      <div className="svc-index">
        {SERVICES.map((s) => {
          const c = filledCopy(s, locale);
          return (
            <Link key={s.slug} href={servicePath(s.slug)} className="svc-index-card">
              <div className="service-name">{c.name}</div>
              <p className="service-desc">{c.lede.replace(/\n/g, " ").slice(0, 140)}…</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
