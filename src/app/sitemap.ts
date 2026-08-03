import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { routing } from "@/i18n/routing";
import { publicPaths } from "@/lib/site-routes";

// 主站 sitemap。客戶子網域由 proxy.ts 攔下（尚未對外的客戶站不該有 sitemap）。
//
// 語系網址規則要跟 next-intl 的 localePrefix: "as-needed" 一致：
// 預設語系 zh-TW 沒有前綴（/cart），其他語系才有（/en/cart）。
function urlFor(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const p = path === "/" ? "" : path;
  const url = `${SITE.url}${prefix}${p}`;
  // 預設語系的首頁會變成裸 origin（沒有路徑），補上斜線才是合法的 <loc>
  return prefix === "" && p === "" ? `${url}/` : url;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicPaths().flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
      // 告訴搜尋引擎同一頁的各語系版本，避免被判成重複內容
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, urlFor(l, path)]),
        ),
      },
    })),
  );
}
