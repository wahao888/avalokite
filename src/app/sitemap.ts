import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { publicPaths } from "@/lib/site-routes";
import { languageAlternates, localeUrl } from "@/lib/seo";

// 主站 sitemap。客戶子網域由 proxy.ts 攔下（尚未對外的客戶站不該有 sitemap）。

/**
 * lastmod 取「組成這一頁的原始檔」最後一次 commit 的時間。
 *
 * 以前填 build 當下的時間：每次部署全站都說自己剛改過，Google 很快就學會不信
 * 這個欄位，真正改過的頁面也就失去了被優先重爬的機會。
 * build 在本機跑（見 deploy.sh），取得到 git；取不到時寧可不填，也不要填假的。
 */
function lastCommitDate(sources: string[]): Date | undefined {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...sources], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? new Date(out) : undefined;
  } catch {
    return undefined;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths().flatMap(({ path, priority, sources }) => {
    const lastModified = lastCommitDate(sources);
    return routing.locales.map((locale) => ({
      url: localeUrl(locale, path),
      ...(lastModified ? { lastModified } : {}),
      priority,
      // 告訴搜尋引擎同一頁的各語系版本，避免被判成重複內容
      alternates: { languages: languageAlternates(path) },
    }));
  });
}
