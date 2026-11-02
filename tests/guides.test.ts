import { describe, it, expect } from "vitest";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";

describe("guides and industries", () => {
  it("guide slugs and dates are unique and complete", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(GUIDES.length).toBeGreaterThanOrEqual(6);
    for (const g of GUIDES) {
      expect(g.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.i18n["zh-TW"].title.length).toBeGreaterThan(8);
      expect(g.i18n.en.title.length).toBeGreaterThan(8);
      expect(g.i18n["zh-TW"].sections.length).toBeGreaterThan(0);
    }
  });

  it("industry slugs are unique", () => {
    const slugs = INDUSTRIES.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(3);
  });
});
