import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import PlanQuiz from "@/components/PlanQuiz";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/quiz",
    title: zh ? "三題挑方案｜形象官網或商務網站｜Avalo" : "Three questions to pick a plan | Avalo",
    description: zh ? "要不要線上收款、需要幾頁、要不要 AI 客服。推薦標準方案，可加入購物車。" : "Payment, page count, AI support. A standard plan you can add to the cart.",
  });
}

export default async function QuizPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "挑方案" : "Pick a plan", path: "/quiz" },
        ])}
      />
      <div className="mono-label">QUIZ</div>
      <h1 className="section-title">{zh ? "三題挑方案" : "Three questions"}</h1>
      <p className="fa-lede">
        {zh ? "這不是心理測驗。答案只對應官網上已公開的標準方案。" : "Not a personality test. Answers map to published plans."}
      </p>
      <PlanQuiz />
    </main>
  );
}
