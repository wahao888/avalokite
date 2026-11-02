import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import { servicePath } from "@/lib/services";
import { routing } from "@/i18n/routing";
import zhTW from "@/messages/zh-TW.json";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => INDUSTRIES.map((i) => ({ locale, slug: i.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const i = getIndustry(slug);
  if (!i) return {};
  const c = i.i18n[locale === "en" ? "en" : "zh-TW"];
  return pageMetadata({ locale, path: `/industries/${slug}`, title: c.title, description: c.description });
}

export default async function IndustryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const i = getIndustry(slug);
  if (!i) notFound();
  const zh = locale !== "en";
  const c = i.i18n[zh ? "zh-TW" : "en"];
  const cases = ((zhTW as { cases?: { items?: { url?: string; name?: string }[] } }).cases?.items ?? []).filter((x) =>
    i.cases.includes(x.url ?? ""),
  );
  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: c.name, path: `/industries/${slug}` },
        ])}
      />
      <div className="mono-label">{c.name}</div>
      <h1 className="section-title" style={{ whiteSpace: "pre-line" }}>{c.h1}</h1>
      <p className="fa-lede">{c.lede}</p>
      <div className="fa-why">
        {c.points.map((p, n) => (
          <div className="fa-why-item" key={p.t}>
            <div className="fa-why-num">0{n + 1}</div>
            <div className="fa-why-t">{p.t}</div>
            <div className="fa-why-d">{p.d}</div>
          </div>
        ))}
      </div>
      {cases.length > 0 && (
        <section className="fa-section">
          <h2 className="fa-h2">{zh ? "線上可驗證的案例" : "Live work"}</h2>
          <ul className="prose-list">
            {cases.map((x) => (
              <li key={x.url}>
                <Link href={x.url!}>{x.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="fa-hero-cta">
        <Link href={servicePath(i.service)} className="btn-primary">{zh ? "看對應服務" : "See the service"}</Link>
        <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
      </div>
    </main>
  );
}
