import { describe, it, expect } from "vitest";
import { getTenant, tenantFromHost, robotsFor, sitemapFor } from "../src/lib/tenants";
import {
  daysLeft,
  flagsOf,
  flavorBySlug,
  isExpired,
  isLimited,
  isNew,
  listFlavors,
  listHighlights,
  listSignature,
} from "../src/app/sites/monsieurlong/_data/flavors";
import { isUpcoming, listPast, listUpcoming } from "../src/app/sites/monsieurlong/_data/events";

// Monsieur Long 客戶站。這裡守的是「改資料時最容易靜靜壞掉」的幾條線：
// 租戶登錄與 robots／sitemap 的一致性，以及口味／活動那套日期自動判定。

const T = () => getTenant("monsieurlong")!;
const DAY = 86_400_000;

describe("租戶登錄", () => {
  it("由子網域解析得到本租戶，且不會被相似網域騙過", () => {
    expect(tenantFromHost("monsieurlong.avalokite.xyz")?.slug).toBe("monsieurlong");
    expect(tenantFromHost("monsieurlong.localhost:3000")?.slug).toBe("monsieurlong");
    // 錨定兩端才擋得住這兩種：後綴接他人網域、前綴多字
    expect(tenantFromHost("monsieurlong.avalokite.xyz.evil.com")).toBeNull();
    expect(tenantFromHost("notmonsieurlong.avalokite.xyz")).toBeNull();
    expect(tenantFromHost("avalokite.xyz")).toBeNull();
  });

  it("尚未對外時 robots 全面 Disallow，且不供 sitemap", () => {
    const t = T();
    if (!t.indexable) {
      expect(robotsFor(t)).toContain("Disallow: /");
      // ownSitemap 的站由站內 sitemap.ts 產生，proxy 不代勞
      expect(sitemapFor(t)).toBeNull();
    }
  });

  it("ownSitemap 的租戶一定要有對應的站內 sitemap.ts", async () => {
    const t = T();
    expect(t.ownSitemap).toBe(true);
    const mod = await import("../src/app/sites/monsieurlong/sitemap");
    expect(typeof mod.default).toBe("function");
  });

  it("flavorBoard 只開給真的有這個功能的租戶", () => {
    expect(T().flavorBoard).toBe(true);
    expect(getTenant("wenshan")?.flavorBoard).toBeUndefined();
  });
});

describe("口味目錄", () => {
  it("slug 不重複，色票是合法 hex", async () => {
    const all = await listFlavors();
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map((f) => f.slug)).size).toBe(all.length);
    for (const f of all) {
      expect(f.color, f.slug).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(f.colorDeep, f.slug).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(f.nameZh.length, f.slug).toBeGreaterThan(0);
      expect(f.notes.length, f.slug).toBeGreaterThan(0);
    }
  });

  it("每個 motif 在插畫元件裡都畫得出來（沒有無聲的空白）", async () => {
    const { default: ScoopArt } = await import(
      "../src/app/sites/monsieurlong/_components/ScoopArt"
    );
    const src = (await import("fs")).readFileSync(
      new URL("../src/app/sites/monsieurlong/_components/ScoopArt.tsx", import.meta.url),
      "utf8",
    );
    expect(typeof ScoopArt).toBe("function");
    for (const f of await listFlavors()) {
      expect(src, `${f.slug} 的 motif "${f.motif}" 沒有對應的 case`).toContain(
        `case "${f.motif}":`,
      );
    }
  });

  it("食安欄位在店家確認前一律留空——不能憑空標示過敏原", async () => {
    for (const f of await listFlavors()) {
      expect(f.allergens, `${f.slug} 不該預先填過敏原`).toBeUndefined();
      expect(f.vegan, `${f.slug} 不該預先宣告純素`).toBeUndefined();
      expect(f.alcohol, `${f.slug} 不該預先宣告含酒`).toBeUndefined();
    }
  });

  it("availableFrom / availableTo 自動推出 NEW 與 LIMITED", () => {
    const base = {
      slug: "t",
      nameZh: "測試",
      nameEn: "Test",
      color: "#FFC732",
      colorDeep: "#8F5E00",
      motif: "salt" as const,
      excerpt: "",
      story: [],
      notes: ["x"],
      kind: "seasonal" as const,
    };
    const now = new Date("2026-09-15T12:00:00+08:00").getTime();

    const fresh = { ...base, availableFrom: "2026-09-01" };
    expect(isNew(fresh, now)).toBe(true);

    const old = { ...base, availableFrom: "2026-01-01" };
    expect(isNew(old, now)).toBe(false);

    const running = { ...base, availableTo: "2026-09-20" };
    expect(isLimited(running, now)).toBe(true);
    expect(isExpired(running, now)).toBe(false);
    expect(daysLeft(running, now)).toBe(6);

    const done = { ...base, availableTo: "2026-08-01" };
    expect(isLimited(done, now)).toBe(false);
    expect(isExpired(done, now)).toBe(true);
    expect(daysLeft(done, now)).toBeNull();

    // 沒填日期的常駐款不該被當成限定
    const plain = { ...base, kind: "signature" as const };
    expect(flagsOf(plain, now)).toEqual({
      isNew: false,
      isLimited: false,
      isExpired: false,
      daysLeft: null,
    });
  });

  it("首頁精選不會出現已經下架的口味", async () => {
    const now = Date.now() + 400 * DAY; // 快轉一年，所有限定都過期
    for (const f of await listHighlights(3, now)) {
      expect(isExpired(f, now), `${f.slug} 已過期卻仍被選進首頁`).toBe(false);
    }
  });

  it("招牌區只放常駐款", async () => {
    for (const f of await listSignature(8)) expect(f.kind).toBe("signature");
  });

  it("flavorBySlug 找得到、找不到時回 undefined（後台送髒 slug 不會爆）", () => {
    expect(flavorBySlug("pistachio")?.nameZh).toBe("開心果");
    expect(flavorBySlug("no-such-flavor")).toBeUndefined();
  });
});

describe("活動", () => {
  it("Upcoming / Past 由日期自動分流，不需要手動搬資料", async () => {
    const past = new Date("2020-01-01").getTime();
    const future = new Date("2099-01-01").getTime();
    // 站在 2020 看，所有已排定日期的場次都還沒發生
    expect((await listUpcoming(past)).length).toBeGreaterThan(0);
    // 站在 2099 看，全部都成了作品集
    expect(await listUpcoming(future)).toEqual([]);
    expect((await listPast(future)).length).toBeGreaterThan(0);
  });

  it("沒有日期的場次一律當作已結束（不會憑空排進「即將登場」）", async () => {
    const noDate = (await listPast(Date.now())).find((e) => !e.start && !e.end);
    expect(noDate).toBeDefined();
    expect(isUpcoming(noDate!, Date.now())).toBe(false);
  });
});
