import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import TrustMarks from "@/components/TrustMarks";
import LineCta from "@/components/LineCta";
import PromoPlans from "@/components/sections/PromoPlans";
import { breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";
import { PROMO_WINDOW, promoOpen, seatsLeft } from "@/lib/promo-window";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/launch",
    title: zh ? "零元啟動｜形象官網無建置費・月費 NT$2,000｜Avalo 阿瓦羅" : "Zero Setup | Brand site, no build fee | Avalo",
    description: zh
      ? "建置費 0 元，月費未稅 NT$2,000。下單收席次保留金，上線驗收後折抵第一期。名額有限。"
      : "No build fee. NT$2,000/month excl. VAT. A seat deposit at checkout is credited to month one after launch.",
  });
}

export default async function LaunchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const open = promoOpen();
  const left = seatsLeft();
  const faq = zh
    ? [
        { q: "真的沒有建置費？", a: "對。這一檔把標準建置費攤進 24 個月月費。下單只收 NT$2,000 席次保留金，上線驗收後折抵第一期。" },
        { q: "承諾期內想停怎麼辦？", a: "須補付尚未攤完的建置費，級距寫在服務條款。期滿後可隨時終止，原始碼免費移交。" },
        { q: "名額滿了呢？", a: "恢復形象官網 NT$39,000 起的標準定價。也可以填諮詢或加 LINE 排下一檔。" },
      ]
    : [
        { q: "Is the build fee really zero?", a: "Yes. This run amortises the standard build over 24 months of care. You pay a NT$2,000 seat deposit, credited to month one after launch." },
        { q: "What if I leave during the term?", a: "You pay the unamortised build fee, tiered in the Terms. After the term you can cancel any time and receive the source." },
        { q: "If seats run out?", a: "Standard brand-site pricing from NT$39,000 applies. You can still enquire or add LINE for the next run." },
      ];

  return (
    <main className="page-wrap">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "零元啟動" : "Zero Setup", path: "/launch" },
        ])}
      />
      <JsonLd data={faqLd(faq)} />
      <div className="mono-label">LAUNCH</div>
      <h1 className="section-title">{zh ? "零元啟動" : "Zero Setup"}</h1>
      <p className="fa-lede">
        {zh
          ? `形象官網無建置費，月費未稅 NT$2,000。本檔 ${PROMO_WINDOW.seatsTotal} 席，還剩 ${left} 席；${open ? "仍在收件" : "這一檔已結束"}。`
          : `A brand site with no build fee, NT$2,000/month excl. VAT. ${left} of ${PROMO_WINDOW.seatsTotal} seats left. ${open ? "Open." : "This run has closed."}`}
      </p>
      <div className="fa-hero-cta">
        <LineCta label={zh ? "加 LINE 問這一檔" : "Ask on LINE"} />
        <Link href="/contact" className="btn-ghost">{zh ? "填諮詢表單" : "Enquiry form"}</Link>
      </div>
      <TrustMarks locale={locale} />
      {open ? <PromoPlans /> : (
        <p className="form-feedback err" style={{ marginTop: "2rem" }}>
          {zh ? "這一檔已額滿或截止。" : "This run is closed."}{" "}
          <Link href="/pricing">{zh ? "看標準定價 →" : "See standard pricing →"}</Link>
        </p>
      )}
      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "條件（下單前請讀完）" : "Terms (read before you order)"}</h2>
        <ul className="prose-list">
          <li>{zh ? "最短承諾 24 個月" : "24-month minimum term"}</li>
          <li>{zh ? "期內提前終止，依已扣期數補付尚未攤完的建置費" : "Leaving early: pay the unamortised build fee by tier"}</li>
          <li>{zh ? "訂閱期間原始碼歸 Avalo，滿 24 個月免費移交" : "Source stays with Avalo during the term; handed over free at month 24"}</li>
          <li>{zh ? "資料齊全後 10 個工作天上線" : "Live in 10 business days once content is ready"}</li>
        </ul>
        <p className="form-note">
          <Link href="/legal/terms">{zh ? "完整服務條款" : "Full Terms"}</Link>
        </p>
      </section>
      <section className="fa-section">
        <h2 className="fa-h2">{zh ? "常見問題" : "FAQ"}</h2>
        <FaqList items={faq} />
      </section>
    </main>
  );
}
