import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import SavingsCalc from "@/components/SavingsCalc";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/tools/savings",
    title: zh ? "LINE AI 客服能省多少人力｜試算｜Avalo" : "LINE AI support labour calculator | Avalo",
    description: zh
      ? "用每月詢問則數、每則分鐘、時薪，對照 AI 客服第一年標價。不是保證省下的金額。"
      : "Compare enquiry volume and hourly cost with year-one AI support list prices. Not a guaranteed saving.",
  });
}

export default async function SavingsToolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main className="page-wrap page-wrap-narrow">
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "客服省工試算" : "Support savings", path: "/tools/savings" },
        ])}
      />
      <div className="mono-label">SAVINGS</div>
      <h1 className="section-title">{zh ? "LINE AI 客服能省多少人力" : "Labour a LINE AI agent might replace"}</h1>
      <p className="fa-lede">
        {zh
          ? "把現在花在回覆上的時間乘出來，再對照方案標價。AI 仍會把議價與客訴轉給專人。"
          : "Multiply the time you spend answering, then compare list prices. The agent still hands off haggling and complaints."}
      </p>
      <SavingsCalc />
    </main>
  );
}
