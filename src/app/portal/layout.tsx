import type { Metadata } from "next";
import "./portal.css";

// 第三個 root layout（主站 [locale]、客戶站 sites/<slug>、以及這裡）。
// 後台跨租戶共用，所以不掛任何一家客戶的字型或樣式。

export const metadata: Metadata = {
  title: "表單管理",
  // 後台永遠不進索引
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="portal">{children}</body>
    </html>
  );
}
