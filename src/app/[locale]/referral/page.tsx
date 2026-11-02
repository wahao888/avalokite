import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import LineCta from "@/components/LineCta";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/referral",
    title: zh ? "合作轉介｜雙方各折一個月維護費｜Avalo 阿瓦羅" : "Referral | One month of care each | Avalo",
    description: zh
      ? "記帳士、設計師、代辦介紹成交的建置案，雙方各折一個月維護費。先來信或加 LINE 備案。"
      : "Accountants, designers and agents: a closed build earns each side one month of care off. Write or add LINE first.",
  });
}

export default async function ReferralPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "轉介" : "Referral", path: "/referral" },
        ])}
      />
      <div className="mono-label">REFERRAL</div>
      <h1 className="section-title">{zh ? "合作轉介" : "Referral"}</h1>
      <p className="fa-lede">
        {zh
          ? "客人成交一筆含建置的標準方案，介紹人與被介紹人各折一個月維護費（以該案實際搭配的維護方案為準）。折扣在上線驗收後的月費扣抵，不折現。"
          : "When a referred build closes, both sides get one month of that project's care plan deducted after launch. No cash equivalent."}
      </p>
      <ul className="prose-list">
        <li>{zh ? "先來信或加 LINE 備案，成交後才追認。" : "Register the referral on LINE or email before it closes."}</li>
        <li>{zh ? "促銷檔期方案是否適用，以備案時書面確認為準。" : "Promo plans are included only if confirmed in writing when registered."}</li>
        <li>{zh ? "不適用未成交、僅諮詢、或已是現有客戶的續約。" : "Does not apply to enquiries that do not close, or renewals of existing clients."}</li>
      </ul>
      <p className="form-note">{SITE.email}</p>
      <LineCta label={zh ? "加 LINE 備案" : "Register on LINE"} />
    </main>
  );
}
