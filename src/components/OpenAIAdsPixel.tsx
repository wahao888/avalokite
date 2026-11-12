import Script from "next/script";

const pixelId = process.env.NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID?.trim();

export default function OpenAIAdsPixel() {
  if (!pixelId) return null;

  const config = JSON.stringify({ pixelId }).replace(/</g, "\\u003c");

  return (
    <Script id="openai-ads-pixel" strategy="beforeInteractive">
      {`(function (w, d) {
        if (w.oaiq) return;
        var queue = function () { queue.q.push(arguments); };
        queue.q = [];
        w.oaiq = queue;
        var script = d.createElement("script");
        script.async = true;
        script.src = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
        d.head.appendChild(script);
        queue("init", ${config});
      })(window, document);`}
    </Script>
  );
}
