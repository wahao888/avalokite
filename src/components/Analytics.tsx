import Script from "next/script";

const GA = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** 沒有設定 ID 時不載入任何第三方腳本。CSP 已放行 google 網域，接上 ID 即可。 */
export default function Analytics() {
  if (!GA) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
