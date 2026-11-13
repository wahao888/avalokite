import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import TrustMarks from "@/components/TrustMarks";
import Doodle, { type DoodleName } from "@/components/Doodle";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { servicePath } from "@/lib/services";
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

interface Item {
  icon: DoodleName;
  t: string;
  d: string;
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";

  const work: (Item & { slug: string })[] = zh
    ? [
        { icon: "browser", slug: "website", t: "網站設計開發", d: "形象官網、電商與預約網站，全客製不套版。" },
        { icon: "gears", slug: "ai-automation", t: "企業 AI 自動化", d: "訂單、對帳、報表，重複的流程交給系統。" },
        { icon: "chat", slug: "line-ai-chatbot", t: "智能客服", d: "LINE 與網站上的 AI 客服，用你的資料回答。" },
      ]
    : [
        { icon: "browser", slug: "website", t: "Websites", d: "Brand, commerce and booking sites — custom, never templated." },
        { icon: "gears", slug: "ai-automation", t: "AI automation", d: "Orders, reconciliation and reports, run by the system." },
        { icon: "chat", slug: "line-ai-chatbot", t: "AI support", d: "AI support on LINE and your site, answering from your data." },
      ];

  const steps: Item[] = zh
    ? [
        { icon: "cart", t: "下單或諮詢", d: "標準方案線上下單，客製走表單或 LINE。" },
        { icon: "folder", t: "素材齊備", d: "文案、圖片到齊，交期才起算。" },
        { icon: "pencil", t: "設計與開發", d: "有進度網址可看，設計含兩次修改。" },
        { icon: "rocket", t: "驗收上線", d: "部署、網域、HTTPS；14 日內錯誤免費修。" },
        { icon: "shield", t: "維護接手", d: "主機、備份、監控與內容更新。" },
      ]
    : [
        { icon: "cart", t: "Order or enquire", d: "Standard plans online; custom via the form or LINE." },
        { icon: "folder", t: "Content ready", d: "The clock starts when copy and images arrive." },
        { icon: "pencil", t: "Design and build", d: "A progress URL to follow; two design rounds included." },
        { icon: "rocket", t: "Accept and launch", d: "Deploy, domain, HTTPS. Defects in 14 days are free." },
        { icon: "shield", t: "Care takes over", d: "Hosting, backups, monitoring and edits." },
      ];

  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "關於" : "About", path: "/about" },
        ])}
      />

      <header className="ip-hero">
        <div>
          <div className="mono-label">ABOUT</div>
          <h1 className="section-title ip-title">
            {zh ? "關於 Avalo 阿瓦羅" : "About Avalo"}
            <Doodle name="underline" stretch />
          </h1>
          <p className="ip-lede">
            {zh ? (
              <>Avalo 是<b>鏈盾股份有限公司</b>的品牌，做網站、企業 AI 自動化與智能客服。</>
            ) : (
              <>Avalo is the brand of <b>Lien Dun Co., Ltd.</b> We build websites, enterprise AI automation and AI support.</>
            )}
          </p>
          <ul className="ip-chips">
            <li>{zh ? "價格公開、不二價" : "Published prices"}</li>
            <li>{zh ? "標準方案線上下單" : "Order standard plans online"}</li>
          </ul>
        </div>
        <div className="ip-hero-art">
          <Doodle name="heroAbout" />
        </div>
      </header>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "我們做什麼" : "What we do"}</h2>
          <span className="ip-head-note">
            <Link href="/services">{zh ? "全部八項服務 →" : "All eight services →"}</Link>
          </span>
        </div>
        <div className="ip-cards">
          {work.map((x) => (
            <Link className="ip-card" href={servicePath(x.slug)} key={x.slug}>
              <Doodle name={x.icon} size={56} />
              <h3 className="ip-card-t">{x.t}</h3>
              <p className="ip-card-d">{x.d}</p>
              <span className="ip-card-go">{zh ? "看內容與價格 →" : "Details and price →"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "公司資料" : "Company"}</h2>
          <span className="ip-head-note">{zh ? "與經濟部商工登記一致" : "As filed with the Ministry of Economic Affairs"}</span>
        </div>
        <dl className="co-card">
          <div className="co-row">
            <dt><Doodle name="building" size={44} /><span>{zh ? "登記名稱" : "LEGAL NAME"}</span></dt>
            <dd>{COMPANY.legalName}</dd>
          </div>
          <div className="co-row">
            <dt><Doodle name="seal" size={44} /><span>{zh ? "統一編號" : "TAX ID"}</span></dt>
            <dd>{COMPANY.taxId}</dd>
          </div>
          <div className="co-row is-wide">
            <dt><Doodle name="pin" size={44} /><span>{zh ? "地址" : "ADDRESS"}</span></dt>
            <dd>{COMPANY.address}</dd>
          </div>
          <div className="co-row">
            <dt><Doodle name="phone" size={44} /><span>{zh ? "電話" : "PHONE"}</span></dt>
            <dd><a href={`tel:${COMPANY.phoneTel}`}>{COMPANY.phoneDisplay}</a></dd>
          </div>
          <div className="co-row">
            <dt><Doodle name="mail" size={44} /><span>EMAIL</span></dt>
            <dd><a href={`mailto:${SITE.email}`}>{SITE.email}</a></dd>
          </div>
        </dl>
      </section>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "合作流程" : "How we work"}</h2>
        </div>
        <ol className="ip-flow is-5">
          {steps.map((s, i) => (
            <li className="ip-step" key={s.t}>
              <span className="ip-step-num">0{i + 1}</span>
              <Doodle name={s.icon} size={52} className="ip-step-icon" />
              <h3 className="ip-step-t">{s.t}</h3>
              <p className="ip-step-d">{s.d}</p>
              <Doodle name="arrow" className="ip-step-arrow" />
            </li>
          ))}
        </ol>
      </section>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "每個方案都有的保證" : "On every plan"}</h2>
        </div>
        <TrustMarks locale={locale} />
      </section>

      <div className="ip-cta">
        <div className="ip-cta-text">
          <Doodle name="chat" size={52} />
          <div>
            <div className="ip-cta-t">{zh ? "先看做過什麼，或直接聊" : "See the work, or just talk"}</div>
            <p className="ip-cta-d">{zh ? "諮詢不收費。" : "Consults are free."}</p>
          </div>
        </div>
        <div className="ip-cta-actions">
          <Link href="/cases" className="btn-primary">{zh ? "看案例" : "See work"}</Link>
          <LineCta label={zh ? "加 LINE" : "LINE"} className="btn-ghost" />
        </div>
      </div>
    </main>
  );
}
