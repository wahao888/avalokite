import { describe, it, expect } from "vitest";
import { SERVICES, fill, filledCopy, getService, servicePath } from "@/lib/services";

describe("services copy", () => {
  it("every slug is unique and has a path", () => {
    const slugs = SERVICES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of SERVICES) expect(servicePath(s.slug)).toBe(`/services/${s.slug}`);
  });

  it("fill() expands every price token or throws", () => {
    for (const s of SERVICES) {
      expect(() => filledCopy(s, "zh-TW")).not.toThrow();
      expect(() => filledCopy(s, "en")).not.toThrow();
      const zh = filledCopy(s, "zh-TW");
      expect(`${zh.title}${zh.h1}${zh.lede}`).not.toMatch(/\{price:|\{addon:|\{line\}/);
    }
  });

  it("unknown sku throws instead of shipping a blank price", () => {
    expect(() => fill("x {price:does-not-exist}")).toThrow(/不存在的方案/);
  });

  it("getService finds website", () => {
    expect(getService("website")?.skus).toContain("web-basic");
  });
});
