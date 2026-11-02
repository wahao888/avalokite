import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { PRIVATE_PATHS, publicPaths } from "@/lib/site-routes";
import { languageAlternates, localeUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import { SERVICES, servicePath } from "@/lib/services";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";
import { llmsTxt } from "@/lib/llms";
import { COMPANY, SITE } from "@/lib/site";

// SEO 的錯都是沉默的：sitemap 指到 404、robots 放行了後台、某一頁沒有人連過去，
// 網站照樣跑得好好的，只有收錄會慢慢爛掉，而且要幾個月後看排名才發現。
// 所以這一整檔守的都是「結構對不對」，不是文案寫得好不好。

const ROOT = process.cwd();
const APP = path.join(ROOT, "src/app/[locale]");

/** 這條公開路徑有沒有對應的頁面檔（靜態的或 [slug]／[doc] 動態的） */
function hasPage(p: string): boolean {
  if (p === "/") return existsSync(path.join(APP, "page.tsx"));
  if (existsSync(path.join(APP, p, "page.tsx"))) return true;
  const parts = p.split("/").filter(Boolean);
  const parent = parts.slice(0, -1).join("/");
  return ["[slug]", "[doc]"].some((d) => existsSync(path.join(APP, parent, d, "page.tsx")));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

/** 站內所有寫死的 href。用來抓孤兒頁：沒人連的頁面，Google 爬了也多半不收。 */
const linkedHrefs = (() => {
  const set = new Set<string>();
  for (const f of [...walk(path.join(ROOT, "src/components")), ...walk(path.join(ROOT, "src/app"))]) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/href=(?:"([^"]+)"|\{"([^"]+)"\}|\{`([^`$]+)`\})/g)) {
      set.add((m[1] ?? m[2] ?? m[3]) as string);
    }
  }
  return set;
})();

/** 由集合產生的路徑（服務、指南、產業、案例）不是一頁一頁寫死連結的，另外驗 */
const COLLECTION_PREFIXES = ["/services/", "/guides/", "/industries/", "/cases/"];
const isCollectionChild = (p: string) => COLLECTION_PREFIXES.some((c) => p.startsWith(c));

describe("公開路由", () => {
  const paths = publicPaths();

  it("數量合理（防止 publicPaths 空掉卻沒人發現）", () => {
    expect(paths.length).toBeGreaterThanOrEqual(30);
  });

  it("每一條都有對應的頁面檔", () => {
    expect(paths.filter((p) => !hasPage(p.path)).map((p) => p.path)).toEqual([]);
  });

  it("路徑不重複", () => {
    const seen = paths.map((p) => p.path);
    expect(seen.length).toBe(new Set(seen).size);
  });

  it("sources 列的檔案都存在（不存在的話 lastmod 會永遠取不到）", () => {
    const missing = paths.flatMap((p) =>
      p.sources.filter((s) => !existsSync(path.join(ROOT, s))).map((s) => `${p.path} → ${s}`),
    );
    expect(missing).toEqual([]);
  });

  it("不含任何該 noindex 的工具頁", () => {
    const leaked = paths.filter((p) => PRIVATE_PATHS.some((priv) => p.path.startsWith(priv)));
    expect(leaked.map((p) => p.path)).toEqual([]);
  });

  it("靜態頁都至少有一處站內連結（孤兒頁不會被好好收錄）", () => {
    const orphans = paths
      .map((p) => p.path)
      .filter((p) => !isCollectionChild(p) && !linkedHrefs.has(p));
    expect(orphans).toEqual([]);
  });
});

describe("由集合產生的頁面要有地方連出去", () => {
  const src = [...walk(path.join(ROOT, "src/components")), ...walk(path.join(ROOT, "src/app"))]
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

  // 這三組各有幾十頁，全掛在 sitemap 上卻沒人連＝Google 眼中的低價值頁
  it.each([
    ["SERVICES", "SERVICES.map"],
    ["GUIDES", "GUIDES.map"],
    ["INDUSTRIES", "INDUSTRIES.map"],
  ])("%s 有頁面把它展開成連結", (_name, needle) => {
    expect(src).toContain(needle);
  });

  it("案例頁的目錄與 sitemap 一一對應", () => {
    const dirs = readdirSync(path.join(APP, "cases"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `/cases/${d.name}`)
      .sort();
    const listed = publicPaths()
      .map((p) => p.path)
      .filter((p) => p.startsWith("/cases/"))
      .sort();
    // 兩邊都要：sitemap 多列＝404，少列＝做了頁面卻沒人找得到
    expect(listed).toEqual(dirs);
  });
});

describe("robots.txt", () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];

  it("每一組 user-agent 都帶著同一份 disallow", () => {
    // robots.txt 是「挑最符合的那一組，其餘整個不看」，不是疊加。
    // 具名群組漏掉 disallow，等於單獨對那隻爬蟲開放後台與帶交易編號的訂閱頁。
    for (const rule of rules) {
      expect(rule.disallow, `${rule.userAgent} 沒有 disallow`).toEqual(PRIVATE_PATHS);
    }
  });

  it("有通用群組，也明確放行主要的 AI 爬蟲", () => {
    const agents = rules.map((x) => x.userAgent);
    expect(agents).toContain("*");
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot"]) {
      expect(agents).toContain(bot);
    }
  });

  it("指到 sitemap", () => {
    expect(r.sitemap).toBe(`${SITE.url}/sitemap.xml`);
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();

  it("每一條公開路徑 × 每一個語系各一筆", () => {
    expect(entries.length).toBe(publicPaths().length * routing.locales.length);
  });

  it("網址不重複", () => {
    const urls = entries.map((e) => e.url);
    expect(urls.length).toBe(new Set(urls).size);
  });

  it("全部是絕對網址，而且沒有結尾多餘的斜線", () => {
    for (const e of entries) {
      expect(e.url.startsWith(`${SITE.url}/`), e.url).toBe(true);
      if (e.url !== `${SITE.url}/` && e.url !== `${SITE.url}/en/`) {
        expect(e.url.endsWith("/"), `${e.url} 多了結尾斜線`).toBe(false);
      }
    }
  });

  it("每一筆都帶 hreflang，且有 x-default", () => {
    for (const e of entries) {
      const langs = e.alternates?.languages ?? {};
      expect(Object.keys(langs), e.url).toContain("x-default");
      for (const l of routing.locales) expect(Object.keys(langs), e.url).toContain(l);
    }
  });

  it("hreflang 指的網址都在 sitemap 裡（互指不到就等於沒設）", () => {
    const urls = new Set(entries.map((e) => e.url));
    for (const e of entries) {
      for (const l of routing.locales) {
        expect(urls.has(e.alternates!.languages![l] as string), `${e.url} 的 ${l}`).toBe(true);
      }
    }
  });
});

describe("canonical 網址規則", () => {
  it("預設語系沒有前綴，其他語系才有", () => {
    expect(localeUrl("zh-TW", "/pricing")).toBe(`${SITE.url}/pricing`);
    expect(localeUrl("en", "/pricing")).toBe(`${SITE.url}/en/pricing`);
  });

  it("首頁要有結尾斜線，不能是裸 origin", () => {
    expect(localeUrl("zh-TW", "/")).toBe(`${SITE.url}/`);
  });

  it("x-default 指向預設語系", () => {
    const alt = languageAlternates("/faq");
    expect(alt["x-default"]).toBe(localeUrl(routing.defaultLocale, "/faq"));
  });
});

describe("/llms.txt", () => {
  const txt = llmsTxt();

  it("帶著統編與登記名稱（網路上有好幾個 Avalo，要分得出是哪一個）", () => {
    expect(txt).toContain(COMPANY.taxId);
    expect(txt).toContain(COMPANY.legalName);
  });

  it("服務、指南、產業都列出絕對網址", () => {
    for (const s of SERVICES) expect(txt).toContain(`${SITE.url}${servicePath(s.slug)}`);
    for (const g of GUIDES) expect(txt).toContain(`${SITE.url}/guides/${g.slug}`);
    for (const i of INDUSTRIES) expect(txt).toContain(`${SITE.url}/industries/${i.slug}`);
  });

  it("不出現相對路徑的網址（AI 爬蟲拿到相對路徑是接不回來的）", () => {
    expect(txt).not.toMatch(/^\s*-\s+\/\S/m);
  });
});
