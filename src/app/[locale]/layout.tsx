import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Fraunces, DM_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import { CartProvider } from "@/lib/cart";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ScrollFx from "@/components/ScrollFx";
import ChatWidget from "@/components/ChatWidget";
import StickyBar from "@/components/StickyBar";
import Analytics from "@/components/Analytics";
import OpenAIAdsPixel from "@/components/OpenAIAdsPixel";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    verification: {
      google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
      other: process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : undefined,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${dmMono.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <CartProvider>
            <Nav />
            {children}
            <Footer />
            <ScrollFx />
            <ChatWidget />
            <StickyBar />
            <Analytics />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
      <OpenAIAdsPixel />
    </html>
  );
}
