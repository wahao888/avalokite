import { describe, it, expect, afterEach } from "vitest";
import { isSuspended, suspendedSlugs, suspendedPage } from "../src/lib/suspension";
import proxy from "../src/proxy";
import { BASE_DOMAIN } from "../src/lib/tenants";

// 這組測試守的是「欠費暫停真的會擋住站台」。這是整份 24 個月合約唯一的執行手段，
// 靜默失效的話不會有人發現——直到某天發現有人白住了半年。

const HOST = `rekat.${BASE_DOMAIN}`;

function run(host: string, path: string) {
  const req = new Request(`https://${host}${path}`, { headers: { host } });
  const { NextRequest } = require("next/server") as typeof import("next/server");
  return proxy(new NextRequest(req));
}

afterEach(() => {
  delete process.env.SUSPENDED_TENANTS;
});

describe("SUSPENDED_TENANTS 解析", () => {
  it("逗號分隔、去空白、不分大小寫", () => {
    process.env.SUSPENDED_TENANTS = " Rekat , wenshan ";
    expect([...suspendedSlugs()].sort()).toEqual(["rekat", "wenshan"]);
    expect(isSuspended("rekat")).toBe(true);
    expect(isSuspended("REKAT")).toBe(true);
    expect(isSuspended("monsieurlong")).toBe(false);
  });

  it("未設定或空字串＝沒有人被暫停（不能因為忘了設而全站掛掉）", () => {
    delete process.env.SUSPENDED_TENANTS;
    expect(suspendedSlugs().size).toBe(0);
    process.env.SUSPENDED_TENANTS = "";
    expect(suspendedSlugs().size).toBe(0);
    process.env.SUSPENDED_TENANTS = " , ,";
    expect(suspendedSlugs().size).toBe(0);
    expect(isSuspended("rekat")).toBe(false);
  });

  it("每次呼叫都重讀 env（改 .env 重啟即生效，不必清快取）", () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    expect(isSuspended("rekat")).toBe(true);
    process.env.SUSPENDED_TENANTS = "";
    expect(isSuspended("rekat")).toBe(false);
  });
});

describe("proxy 對被暫停租戶的處理", () => {
  it("頁面回 503 暫停頁，且不是改寫（被停的站不再跑自己的 render）", async () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    const res = run(HOST, "/beans");
    expect(res.status).toBe(503);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    await expect(res.text()).resolves.toContain("服務暫停中");
  });

  it("robots.txt 改回 Disallow，避免暫停頁被索引取代既有排名", async () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    const res = run(HOST, "/robots.txt");
    expect(res.status).toBe(503);
    await expect(res.text()).resolves.toBe("User-agent: *\nDisallow: /\n");
  });

  it("sitemap 也停掉", () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    expect(run(HOST, "/sitemap.xml").status).toBe(503);
  });

  it("/portal 仍放行——條款保證客戶隨時可匯出自己的資料", () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    const res = run(HOST, "/portal/orders");
    expect(res.status).not.toBe(503);
  });

  it("沒被暫停的租戶完全不受影響", () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    const res = run(`monsieurlong.${BASE_DOMAIN}`, "/flavors");
    expect(res.status).not.toBe(503);
    expect(res.headers.get("x-middleware-rewrite")).toContain("/sites/monsieurlong/flavors");
  });

  it("主站不受任何租戶的暫停影響", () => {
    process.env.SUSPENDED_TENANTS = "rekat";
    expect(run(BASE_DOMAIN, "/").status).not.toBe(503);
  });
});

describe("暫停頁內容", () => {
  it("含店名與聯絡方式，並標 noindex", () => {
    const html = suspendedPage("測試店", "service@example.com");
    expect(html).toContain("測試店");
    expect(html).toContain("service@example.com");
    expect(html).toContain('name="robots" content="noindex,nofollow"');
  });
});
