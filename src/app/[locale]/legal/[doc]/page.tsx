import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LEGAL, type DocKey } from "@/lib/legal-content";
import { routing } from "@/i18n/routing";

const DOCS: DocKey[] = ["terms", "privacy", "refund"];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    DOCS.map((doc) => ({ locale, doc }))
  );
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; doc: string }>;
}) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!DOCS.includes(doc as DocKey)) notFound();

  const t = await getTranslations({ locale, namespace: "legal" });
  const content = LEGAL[doc as DocKey][locale === "en" ? "en" : "zh-TW"];

  return (
    <main className="page-wrap page-wrap-narrow">
      <div className="mono-label">LEGAL</div>
      <h1 className="section-title">{t(doc as DocKey)}</h1>
      <p className="form-note" style={{ marginBottom: "2rem" }}>
        {t("updated")}：{content.updated}
      </p>
      <div className="legal-content">
        {content.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
