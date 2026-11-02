import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { COMPANY, SITE } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/about",
    title: zh ? "關於 Avalo 阿瓦羅｜鏈盾股份有限公司" : "About Avalo | Lien Dun Co., Ltd.",
    description: zh
      ? `Avalo 是${COMPANY.legalName}的品牌。做網站設計開發、企業 AI 自動化與智能客服。統編 ${COMPANY.taxId}，${COMPANY.address}。`
      : `Avalo is the brand of ${COMPANY.legalName}. Web design, enterprise AI automation and support. Tax ID ${COMPANY.taxId}.`,
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const steps = zh
    ? [
        { t: "下單或諮詢", d: "標準方案線上下單；客製走表單或 LINE。" },
        { t: "素材齊備", d: "文案、圖片、商品資料到齊，交期才起算。" },
        { t: "設計與開發", d: "期間可看進度網址。設計含兩次修改。" },
        { t: "驗收上線", d: "部署、網域、HTTPS。14 日內錯誤修正免費。" },
        { t: "維護接手", d: "主機、備份、監控、內容更新。你做生意，系統交給我們。" },
      ]
    : [
        { t: "Order or enquire", d: "Standard plans online; custom via the form or LINE." },
        { t: "Content ready", d: "The clock starts when copy, images and product data arrive." },
        { t: "Design and build", d: "A progress URL while we work. Two design rounds included." },
        { t: "Accept and launch", d: "Deploy, domain, HTTPS. Defects in 14 days are free." },
        { t: "Care takes over", d: "Hosting, backups, monitoring, edits." },
      ];

  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "關於" : "About", path: "/about" },
        ])}
      />
      <div className="mono-label">ABOUT</div>
      <h1 className="section-title">{zh ? "關於 Avalo 阿瓦羅" : "About Avalo"}</h1>
      <p className="fa-lede">
        {zh
          ? "Avalo 是鏈盾股份有限公司對外的品牌，做網站設計開發、企業 AI 自動化與智能客服。價格公開、不二價，標準方案可線上下單。"
          : "Avalo is the public brand of Lien Dun Co., Ltd. We build websites, enterprise AI automation and support. Prices are published; standard plans can be ordered online."}
      </p>
      <dl className="about-dl">
        <dt>{zh ? "登記名稱" : "Legal name"}</dt>
        <dd>{COMPANY.legalName}</dd>
        <dt>{zh ? "統一編號" : "Tax ID"}</dt>
        <dd>{COMPANY.taxId}</dd>
        <dt>{zh ? "地址" : "Address"}</dt>
        <dd>{COMPANY.address}</dd>
        <dt>{zh ? "電話" : "Phone"}</dt>
        <dd><a href={`tel:${COMPANY.phoneTel}`}>{COMPANY.phoneDisplay}</a></dd>
        <dt>Email</dt>
        <dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd>
      </dl>
      <p className="form-note">
        {zh
          ? "創辦人照片與個人經歷放上這頁之前，先以公司登記資料與可驗證的案例為準——這是搜尋引擎與 AI 用來確認「誰在做」的硬資料。"
          : "Until founder photos sit on this page, the legal filing and live case studies are the hard evidence of who does the work."}
      </p>
      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "合作流程" : "How we work"}</h2>
        <div className="fa-flow">
          {steps.map((s, i) => (
            <div className="fa-flow-item" key={s.t}>
              <div className="fa-flow-node">
                <span className="fa-flow-num">{i + 1}</span>
              </div>
              <div className="fa-flow-t">{s.t}</div>
              <div className="fa-flow-d">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="fa-hero-cta">
        <Link href="/cases" className="btn-primary">{zh ? "看案例" : "See work"}</Link>
        <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
      </div>
    </main>
  );
}
