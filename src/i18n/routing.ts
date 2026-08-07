import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh-TW", "en"],
  defaultLocale: "zh-TW",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/**
 * 語系前綴為 as-needed：預設語系（zh-TW）不帶前綴，寫死 `/zh-TW/...` 會多吃一次 307。
 * 給「不經 next-intl Link 產生」的連結用——信件內容、API redirect、原生 <a>。
 */
export function localePath(locale: string, path: string) {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}
