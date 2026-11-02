import { describe, it, expect } from "vitest";
import { publicPaths } from "@/lib/site-routes";
import { INDEXNOW_KEY } from "@/lib/indexnow";
import { readFileSync, existsSync } from "node:fs";
import { mentionsAvalo } from "@/lib/geo-prompts";
import { llmsTxt } from "@/lib/llms";

describe("public SEO routes", () => {
  it("lists the new indexable pages", () => {
    const paths = publicPaths().map((p) => p.path);
    for (const p of [
      "/pricing",
      "/services",
      "/services/website",
      "/faq",
      "/guides",
      "/tools/geo",
      "/quiz",
      "/about",
      "/contact",
      "/referral",
    ]) {
      expect(paths).toContain(p);
    }
  });

  it("IndexNow key file matches the constant", () => {
    const file = `public/${INDEXNOW_KEY}.txt`;
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("llms.txt mentions the brand and a live price", () => {
    const text = llmsTxt();
    expect(text).toMatch(/Avalo/);
    expect(text).toMatch(/NT\$/);
    expect(text).toMatch(/\/services\/website/);
  });

  it("GEO mention detector is case-insensitive", () => {
    expect(mentionsAvalo("可以找 Avalo 阿瓦羅")).toBe(true);
    expect(mentionsAvalo("random agency")).toBe(false);
  });
});
