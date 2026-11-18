import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import ReferralInvite from "@/components/ReferralInvite";
import { Link } from "@/i18n/navigation";
import { REFERRAL_SERVICES, REWARD_VALID_MONTHS, validReferralCode } from "@/lib/referral";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

const ntd = (v: number) => `NT$${v.toLocaleString("en-US")}`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/referral",
    title: zh ? "邀請朋友｜雙方各送一次免費服務｜Avalo 阿瓦羅" : "Referral | A free service for both of you | Avalo",
    description: zh
      ? "有付費維護訂閱的客戶，介紹新朋友使用邀請碼並完成任一項目付款，雙方各送一次免費服務：網站健檢、SEO 起步包或新增一頁，三選一，可累積。"
      : "Active care subscribers: invite a new customer who pays for any item with your code, and you both get a free service: a website health check, SEO starter or one extra page. Rewards accumulate.",
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
      <h1 className="section-title">{zh ? "介紹朋友，雙方各送一次服務" : "Invite a friend. A free service for both of you."}</h1>
      <p className="fa-lede">
        {zh
          ? "只要你有正常付費中的維護訂閱，介紹新朋友在結帳時填入你的邀請碼，並完成任一項目付款，你和朋友就各獲得一次免費服務。"
          : "Have an active, paid care subscription? When a new customer uses your invitation code at checkout and pays for any item, you both get one free service."}
      </p>
      {validReferralCode(code) && <ReferralInvite code={code} zh={zh} />}
      <h2 className="fa-h2">{zh ? "三選一" : "Choose one"}</h2>
      <ul className="prose-list">
        {REFERRAL_SERVICES.map((s) => (
          <li key={s.key}>
            <strong>{zh ? s.zh.name : s.en.name}</strong>
            {s.value ? (zh ? `（價值 ${ntd(s.value)}）` : ` (worth ${ntd(s.value)})`) : ""}
            {zh ? "：" : ": "}
            {zh ? s.zh.desc : s.en.desc}
          </li>
        ))}
      </ul>
      <h2 className="fa-h2">{zh ? "規則" : "How it works"}</h2>
      <ul className="prose-list">
        <li>{zh ? "從「訂單查詢 → 管理訂閱」取得專屬邀請碼與分享連結。" : "Get your code and share link from Order Lookup → Manage subscription."}</li>
        <li>{zh ? "適用任一付費項目，包含促銷方案；以實際付款成功為準，僅諮詢或未付款不計。推薦人的維護訂閱在付款成功時須仍有效且無欠費。" : "Any paid item qualifies, including promotional plans. Enquiries and unpaid orders do not. The inviter must still have active care with no overdue payment when payment succeeds."}</li>
        <li>{zh ? "每位新客戶限使用一次，以 Email 與電話辨識；不可自行推薦。既有客戶續約、重複購買不再發放。" : "One referral per new customer, identified by email and phone. No self-referrals or rewards for existing customers' renewals or repeat purchases."}</li>
        <li>{zh ? `獎勵綁定 Email，推薦不同朋友可累積；核發起 ${REWARD_VALID_MONTHS} 個月內有效，不折現、不轉讓。` : `Rewards are tied to your email and accumulate across different friends. Each is valid for ${REWARD_VALID_MONTHS} months, with no cash value or transfers.`}</li>
        <li>{zh ? "推薦成功會收到通知信，回信或透過 LINE 告訴我們想使用哪一項，我們會與你確認時程。" : "You'll get an email when a referral succeeds. Reply or message us on LINE with your choice and we'll schedule it with you."}</li>
        <li>{zh ? "獎勵與維護月費無關，不影響原本的扣款與承諾期。" : "Rewards are separate from care billing and do not change your payments or minimum term."}</li>
      </ul>
      <p className="form-note">{SITE.email}</p>
      <Link className="btn-primary" href="/order/lookup">{zh ? "查詢訂單與邀請碼" : "Find your order and code"}</Link>
    </main>
  );
}
