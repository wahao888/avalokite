import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import ReferralInvite from "@/components/ReferralInvite";
import { Link } from "@/i18n/navigation";
import { validReferralCode } from "@/lib/referral";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/referral",
    title: zh ? "邀請朋友｜雙方各送一個月免費維護｜Avalo 阿瓦羅" : "Referral | One free month of care each | Avalo",
    description: zh
      ? "有付費維護訂閱的客戶，介紹新朋友使用邀請碼並完成任一項目付款，雙方各送一個月免費維護，可累積；尚未訂閱先保留。"
      : "Active care subscribers: invite a new customer who pays for any item with your code. Both receive one free month of care. Months accumulate and can be saved until care starts.",
  });
}

export default async function ReferralPage({ params, searchParams }: {
  params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  const query = await searchParams;
  const code = typeof query.code === "string" ? query.code.trim().toUpperCase() : "";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "轉介" : "Referral", path: "/referral" },
        ])}
      />
      <div className="mono-label">REFERRAL</div>
      <h1 className="section-title">{zh ? "介紹朋友，雙方各送一個月" : "Invite a friend. One free month each."}</h1>
      <p className="fa-lede">
        {zh
          ? "只要你有正常付費中的維護訂閱，介紹新朋友在結帳時填入你的邀請碼，並完成任一項目付款，你和朋友就各獲得一個月免費維護。"
          : "Have an active, paid care subscription? When a new customer uses your invitation code at checkout and pays for any item, you both earn one free month of care."}
      </p>
      {validReferralCode(code) && <ReferralInvite code={code} zh={zh} />}
      <ul className="prose-list">
        <li>{zh ? "從「訂單查詢 → 管理訂閱」取得專屬邀請碼與分享連結。" : "Get your code and share link from Order Lookup → Manage subscription."}</li>
        <li>{zh ? "適用任一付費項目，包含促銷方案；以實際付款成功為準，僅諮詢或未付款不計。推薦人的維護訂閱在付款成功時須仍有效且無欠費。" : "Any paid item qualifies, including promotional plans. Enquiries and unpaid orders do not. The inviter must still have active care with no overdue payment when payment succeeds."}</li>
        <li>{zh ? "每位新客戶限使用一次，以 Email 與電話辨識；不可自行推薦。既有客戶續約、重複購買不再發放。" : "One referral per new customer, identified by email and phone. No self-referrals or rewards for existing customers' renewals or repeat purchases."}</li>
        <li>{zh ? "成功推薦不同朋友可累積。每個月適用自己使用的維護方案，不折現、不轉讓，也不延長原本的最短承諾期。" : "Referrals of different friends accumulate. Each free month covers your own care plan, with no cash value or transfers and no extension of the minimum term."}</li>
        <li>{zh ? "朋友尚未訂閱維護，月份先保留在結帳 Email，日後以相同 Email 啟用維護時使用。" : "If your friend has no care subscription yet, their month is saved with their checkout email for future care under that email."}</li>
        <li>{zh ? "免費月份由我們安排不收費的維護期間；確認後會顯示於訂閱管理頁。安排前仍依原訂閱排程扣款。" : "We arrange the care period with no charge. Confirmed dates appear on your subscription page; the existing billing schedule applies until then."}</li>
      </ul>
      <p className="form-note">{SITE.email}</p>
      <Link className="btn-primary" href="/order/lookup">{zh ? "查詢訂單與邀請碼" : "Find your order and code"}</Link>
    </main>
  );
}
