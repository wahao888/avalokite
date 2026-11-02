import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import { articleLd, breadcrumbLd, pageMetadata } from "@/lib/seo";
import { GUIDES, getGuide } from "@/lib/guides";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  const c = g.i18n[locale === "en" ? "en" : "zh-TW"];
  return pageMetadata({ locale, path: `/guides/${slug}`, title: `${c.title}｜Avalo`, description: c.description });
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const g = getGuide(slug);
  if (!g) notFound();
  const zh = locale !== "en";
  const c = g.i18n[zh ? "zh-TW" : "en"];
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "指南" : "Guides", path: "/guides" },
          { name: c.title, path: `/guides/${slug}` },
        ])}
      />
      <JsonLd
        data={articleLd({ locale, path: `/guides/${slug}`, title: c.title, description: c.description, date: g.date })}
      />
      <p>
        <Link href="/guides" className="fa-back">{zh ? "← 全部指南" : "← All guides"}</Link>
      </p>
      <p className="mono-label">{g.date}</p>
      <h1 className="section-title">{c.title}</h1>
      <p className="fa-lede">{c.lede}</p>
      {c.sections.map((s) => (
        <section className="fa-section" key={s.h}>
          <h2 className="fa-h2">{s.h}</h2>
          {s.body.map((p) => (
            <p className="fa-p" key={p.slice(0, 40)}>{p}</p>
          ))}
        </section>
      ))}
      <p className="form-note">
        {zh ? "延伸閱讀：" : "Also:"}{" "}
        {g.related.map((p) => (
          <Link key={p} href={p} style={{ marginRight: "0.8rem" }}>
            {p}
          </Link>
        ))}
      </p>
      <div className="fa-hero-cta">
        <Link href="/contact" className="btn-primary">{zh ? "免費諮詢" : "Enquire"}</Link>
        <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
      </div>
    </main>
  );
}
