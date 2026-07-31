import { describe, it, expect } from "vitest";
import {
  TENANTS,
  RESERVED,
  BASE_DOMAIN,
  getTenant,
  tenantFromHost,
  tenantOrigin,
  robotsFor,
} from "../src/lib/tenants";

describe("租戶登錄表完整性", () => {
  it("slug 格式合法、不重複、不在保留字內", () => {
    const seen = new Set<string>();
    for (const t of TENANTS) {
      expect(t.slug, `${t.slug} 應為小寫英數與連字號`).toMatch(
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
      );
      expect(RESERVED, `${t.slug} 不可使用保留字`).not.toContain(t.slug);
      expect(seen.has(t.slug), `${t.slug} 重複`).toBe(false);
      seen.add(t.slug);
    }
  });

  it("每個租戶都有名稱、通知環境變數與 sitemap 路徑", () => {
    for (const t of TENANTS) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.notifyEnv).toMatch(/^TENANT_NOTIFY_[A-Z0-9_]+$/);
      expect(t.paths.length).toBeGreaterThan(0);
      expect(t.paths).toContain("/");
    }
  });
});

describe("tenantFromHost — 命中", () => {
  it("子網域解析出租戶", () => {
    expect(tenantFromHost(`wenshan.${BASE_DOMAIN}`)?.slug).toBe("wenshan");
  });
  it("忽略埠號與大小寫", () => {
    expect(tenantFromHost(`wenshan.${BASE_DOMAIN}:443`)?.slug).toBe("wenshan");
    expect(tenantFromHost(`WENSHAN.AVALOKITE.XYZ`)?.slug).toBe("wenshan");
    expect(tenantFromHost(`  wenshan.${BASE_DOMAIN}  `)?.slug).toBe("wenshan");
  });
  it("本機開發網域可用", () => {
    expect(tenantFromHost("wenshan.localhost:3000")?.slug).toBe("wenshan");
    expect(tenantFromHost("wenshan.lvh.me:3000")?.slug).toBe("wenshan");
  });
});

describe("tenantFromHost — 必須回 null（路由安全邊界）", () => {
  const cases: [string, string | null | undefined][] = [
    ["apex", BASE_DOMAIN],
    ["www", `www.${BASE_DOMAIN}`],
    ["未登錄的子網域", `unknown.${BASE_DOMAIN}`],
    ["保留字子網域", `admin.${BASE_DOMAIN}`],
    // 正則若沒錨定 ^，notwenshan 會被當成 wenshan 的一部分
    ["前綴混淆", `notwenshan.${BASE_DOMAIN}`],
    ["後綴混淆", `wenshanx.${BASE_DOMAIN}`],
    // 正則若沒錨定 $，攻擊者自有網域會被當成我們的租戶
    ["尾綴劫持", `wenshan.${BASE_DOMAIN}.evil.com`],
    ["完全外部網域", "evil.com"],
    ["偽裝成路徑", `evil.com/wenshan.${BASE_DOMAIN}`],
    ["多層子網域", `a.wenshan.${BASE_DOMAIN}`],
    ["空字串", ""],
    ["null", null],
    ["undefined", undefined],
    ["只有埠號", ":3000"],
  ];
  it.each(cases)("%s → null", (_label, host) => {
    expect(tenantFromHost(host)).toBeNull();
  });
});

describe("getTenant", () => {
  it("未知或空值回 null", () => {
    expect(getTenant("nope")).toBeNull();
    expect(getTenant(null)).toBeNull();
    expect(getTenant(undefined)).toBeNull();
  });
});

describe("tenantOrigin 與 robotsFor", () => {
  const base = TENANTS[0];

  it("無自有網域時用子網域", () => {
    expect(tenantOrigin({ ...base, domain: undefined })).toBe(
      `https://${base.slug}.${BASE_DOMAIN}`
    );
  });
  it("有自有網域時優先採用，且該網域可反查回租戶", () => {
    const t = { ...base, domain: "wenshanwood.com.tw" };
    expect(tenantOrigin(t)).toBe("https://wenshanwood.com.tw");
  });
  it("indexable=false 時全站 Disallow", () => {
    expect(robotsFor({ ...base, indexable: false })).toContain("Disallow: /");
    expect(robotsFor({ ...base, indexable: false })).not.toContain("Sitemap");
  });
  it("indexable=true 時 Allow 並附 sitemap 絕對網址", () => {
    const r = robotsFor({ ...base, indexable: true, domain: undefined });
    expect(r).toContain("Allow: /");
    expect(r).toContain(`https://${base.slug}.${BASE_DOMAIN}/sitemap.xml`);
  });
});
