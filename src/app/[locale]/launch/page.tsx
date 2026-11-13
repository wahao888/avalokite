import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import JsonLd from "@/components/JsonLd";
import FaqList from "@/components/FaqList";
import TrustMarks from "@/components/TrustMarks";
import LineCta from "@/components/LineCta";
import Doodle, { type DoodleName } from "@/components/Doodle";
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

interface Item {
  icon: DoodleName;
  t: string;
  d: string;
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

  const steps: Item[] = zh
    ? [
        { icon: "card", t: "付 NT$2,000 保留金", d: "鎖定席次，上線後全額折抵第一期月費。" },
        { icon: "rocket", t: "10 個工作天上線", d: "自文案、圖片等資料齊全起算。" },
        { icon: "check", t: "驗收後才開始月費", d: "每月 NT$2,000，含主機與維護。" },
      ]
    : [
        { icon: "card", t: "Pay a NT$2,000 deposit", d: "Holds your seat; credited in full to month one." },
        { icon: "rocket", t: "Live in 10 business days", d: "Counted from when your content is ready." },
        { icon: "check", t: "Billing starts after acceptance", d: "NT$2,000 a month, hosting and care included." },
      ];

  const terms: Item[] = zh
    ? [
        { icon: "calendar", t: "最短承諾 24 個月", d: "期滿後可隨時終止。" },
        { icon: "exit", t: "提前終止須補付建置費", d: "依已扣期數分級，愈後面愈少。" },
        { icon: "code", t: "滿 24 個月原始碼免費移交", d: "訂閱期間原始碼歸 Avalo。" },
      ]
    : [
        { icon: "calendar", t: "24-month minimum term", d: "Cancel any time after that." },
        { icon: "exit", t: "Leaving early costs the unpaid build", d: "Tiered by months billed; it shrinks over time." },
        { icon: "code", t: "Source handed over free at month 24", d: "It stays with Avalo during the term." },
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

      <header className="ip-hero">
        <div>
          <div className="mono-label">LAUNCH</div>
          <h1 className="section-title ip-title">
            {zh ? "零元啟動" : "Zero Setup"}
            <Doodle name="underline" stretch />
          </h1>
          <p className="ip-lede">
            {zh
              ? `形象官網不收建置費，官網、主機與每月維護包成一筆月費。${open ? "" : "這一檔已結束。"}`
              : `A brand site with no build fee — site, hosting and monthly care in one fee. ${open ? "" : "This run has closed."}`}
          </p>
          <div className="ip-facts">
            <div className="ip-fact">
              <div className="ip-fact-label">{zh ? "建置費" : "BUILD FEE"}</div>
              <div className="ip-fact-value">NT$0</div>
            </div>
            <div className="ip-fact">
              <div className="ip-fact-label">{zh ? "月費（未稅）" : "MONTHLY, EXCL. VAT"}</div>
              <div className="ip-fact-value">NT$2,000</div>
            </div>
            <div className="ip-fact">
              <div className="ip-fact-label">{zh ? "本檔名額" : "SEATS"}</div>
              <div className="ip-fact-value">
                {zh ? `剩 ${left}` : `${left} left`}
                <small>{zh ? `／${PROMO_WINDOW.seatsTotal} 席` : `of ${PROMO_WINDOW.seatsTotal}`}</small>
              </div>
            </div>
          </div>
          <div className="fa-hero-cta">
            <LineCta label={zh ? "加 LINE 問這一檔" : "Ask on LINE"} />
            <Link href="/contact" className="btn-ghost">{zh ? "填諮詢表單" : "Enquiry form"}</Link>
          </div>
        </div>
        <div className="ip-hero-art">
          <Doodle name="heroLaunch" />
        </div>
      </header>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "三步開始" : "Three steps"}</h2>
        </div>
        <ol className="ip-flow">
          {steps.map((s, i) => (
            <li className="ip-step" key={s.t}>
              <span className="ip-step-num">0{i + 1}</span>
              <Doodle name={s.icon} size={56} className="ip-step-icon" />
              <h3 className="ip-step-t">{s.t}</h3>
              <p className="ip-step-d">{s.d}</p>
              <Doodle name="arrow" className="ip-step-arrow" />
            </li>
          ))}
        </ol>
      </section>

      {open ? <PromoPlans /> : (
        <p className="form-feedback err" style={{ margin: "0 0 4.5rem" }}>
          {zh ? "這一檔已額滿或截止。" : "This run is closed."}{" "}
          <Link href="/pricing">{zh ? "看標準定價 →" : "See standard pricing →"}</Link>
        </p>
      )}

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "下單前先看這三件事" : "Three things to read first"}</h2>
          <span className="ip-head-note">
            <Link href="/legal/terms">{zh ? "完整服務條款 →" : "Full Terms →"}</Link>
          </span>
        </div>
        <div className="ip-cards">
          {terms.map((x) => (
            <div className="ip-card" key={x.t}>
              <Doodle name={x.icon} size={52} />
              <h3 className="ip-card-t">{x.t}</h3>
              <p className="ip-card-d">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "每個方案都有的保證" : "On every plan"}</h2>
        </div>
        <TrustMarks locale={locale} />
      </section>

      <section className="ip-section">
        <div className="ip-head">
          <h2 className="ip-h2">{zh ? "常見問題" : "FAQ"}</h2>
        </div>
        <FaqList items={faq} />
      </section>
    </main>
  );
}
