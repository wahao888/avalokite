import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LEGAL_VERSION, type DocKey } from "@/lib/legal-content";
import { legalDocAt, legalHash } from "@/lib/legal-consent";
import { routing } from "@/i18n/routing";

const DOCS: DocKey[] = ["terms", "privacy", "refund"];

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    DOCS.map((doc) => ({ locale, doc }))
  );
}

export default async function LegalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; doc: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { locale, doc } = await params;
  setRequestLocale(locale);
  if (!DOCS.includes(doc as DocKey)) notFound();

  const t = await getTranslations({ locale, namespace: "legal" });
  // ?v= 指定版本：訂單確認信裡的連結會帶上客戶當初同意的版本，
  // 讓「我當初同意的是什麼」隨時查得到，而不是只看得到最新版。
  const { v } = await searchParams;
  const content = legalDocAt(doc as DocKey, locale, v);
  const isArchived = !!v && v !== LEGAL_VERSION;

  if (!content) {
    return (
      <main className="page-wrap page-wrap-narrow">
        <div className="mono-label">LEGAL</div>
        <h1 className="section-title">{t(doc as DocKey)}</h1>
        <div className="form-feedback err">{t("versionNotFound", { version: v ?? "" })}</div>
        <a href={`/${locale === "en" ? "en/" : ""}legal/${doc}`} className="btn-ghost">
          {t("viewCurrent")}
        </a>
      </main>
    );
  }

  return (
    <main className="page-wrap page-wrap-narrow">
      <div className="mono-label">LEGAL</div>
      <h1 className="section-title">{t(doc as DocKey)}</h1>
      <p className="form-note" style={{ marginBottom: isArchived ? "1rem" : "2rem" }}>
        {t("version")}：{content.updated}
        {doc !== "privacy" && <>　·　{t("contentId")}：{legalHash(locale, v)}</>}
      </p>
      {isArchived && (
        <div className="form-feedback" style={{ marginBottom: "2rem" }}>
          {t("archivedNotice")}
        </div>
      )}
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
