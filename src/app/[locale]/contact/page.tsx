import { setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/JsonLd";
import Contact from "@/components/sections/Contact";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const zh = locale !== "en";
  return pageMetadata({
    locale,
    path: "/contact",
    title: zh ? "免費諮詢｜LINE 與表單｜Avalo 阿瓦羅" : "Contact | LINE and enquiry form | Avalo",
    description: zh
      ? "標準方案可線上下單。還不確定就加 LINE 或填表單，週一至週五 24 小時內回覆。"
      : "Order standard plans online, or add LINE / send the form. We reply within 24 hours on weekdays.",
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const zh = locale !== "en";
  return (
    <main>
      <JsonLd
        data={breadcrumbLd(locale, [
          { name: zh ? "首頁" : "Home", path: "/" },
          { name: zh ? "聯絡" : "Contact", path: "/contact" },
        ])}
      />
      <Contact heading="h1" />
    </main>
  );
}
