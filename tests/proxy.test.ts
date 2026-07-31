import { describe, it, expect, afterEach, vi } from "vitest";
// 注意：Next 文件寫的是 `unstable_doesProxyMatch`，但實際匯出的名稱是
// `unstable_doesMiddlewareMatch`（見 next/dist/experimental/testing/server/index.d.ts）。
// 照文件寫會 import 到 undefined。
import {
  unstable_doesMiddlewareMatch,
  isRewrite,
  getRewrittenUrl,
} from "next/experimental/testing/server";
import proxy, { config } from "../src/proxy";
import { BASE_DOMAIN } from "../src/lib/tenants";

const TENANT_HOST = `wenshan.${BASE_DOMAIN}`;

/** 用 Host 標頭直接呼叫 proxy，回傳其 Response */
function run(host: string, path: string) {
  const req = new Request(`https://${host}${path}`, { headers: { host } });
  // proxy 只用到 nextUrl / headers，NextRequest 於 node 環境可直接建構
  const { NextRequest } = require("next/server") as typeof import("next/server");
  return proxy(new NextRequest(req));
}

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("matcher 涵蓋範圍", () => {
  it("一般頁面路徑會進 proxy", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/quote")).toBe(true);
    expect(matches("/portal")).toBe(true);
    expect(matches("/robots.txt")).toBe(true);
  });
  it("API 與內部資源不進 proxy", () => {
    expect(matches("/api/wenshan/quote")).toBe(false);
    expect(matches("/_next/static/chunk.js")).toBe(false);
    expect(matches("/demo/glass")).toBe(false);
    expect(matches("/sites/wenshan/og.png")).toBe(false); // 帶副檔名
  });
});

describe("子網域 → /sites/<slug> 改寫", () => {
  it("根路徑不會多出結尾斜線", () => {
    const res = run(TENANT_HOST, "/");
    expect(isRewrite(res)).toBe(true);
    expect(new URL(getRewrittenUrl(res)!).pathname).toBe("/sites/wenshan");
  });

  it.each(["/products", "/quote", "/deep/nested/path"])("%s 改寫到對應內部路徑", (p) => {
    const res = run(TENANT_HOST, p);
    expect(isRewrite(res)).toBe(true);
    expect(new URL(getRewrittenUrl(res)!).pathname).toBe(`/sites/wenshan${p}`);
  });

  it("保留 query string", () => {
    const res = run(TENANT_HOST, "/products?cat=plywood");
    expect(new URL(getRewrittenUrl(res)!).search).toBe("?cat=plywood");
  });

  it("robots.txt 由租戶設定產生，且不是改寫", () => {
    const res = run(TENANT_HOST, "/robots.txt");
    expect(isRewrite(res)).toBe(false);
    expect(res.status).toBe(200);
  });
});

describe("不可改寫的共用路由", () => {
  it.each(["/portal", "/portal/42"])("%s 在子網域下不改寫（租戶由 cookie 比對）", (p) => {
    expect(isRewrite(run(TENANT_HOST, p))).toBe(false);
  });
});

describe("未知 Host 落回主站，不得導向 /sites", () => {
  it.each([BASE_DOMAIN, `www.${BASE_DOMAIN}`, `unknown.${BASE_DOMAIN}`, "evil.com"])(
    "%s 不改寫到 /sites/",
    (host) => {
      const res = run(host, "/");
      const rewritten = getRewrittenUrl(res);
      if (rewritten) expect(new URL(rewritten).pathname).not.toMatch(/^\/sites\//);
    }
  );
});

describe("apex 不可直達內部路徑", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["/sites/wenshan", "/sites/wenshan/quote", "/portal"])(
    "production 下 %s 回 404",
    (p) => {
      vi.stubEnv("NODE_ENV", "production");
      expect(run(BASE_DOMAIN, p).status).toBe(404);
    }
  );

  it("開發模式保留直達，方便本機檢視", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(run(BASE_DOMAIN, "/sites/wenshan").status).toBe(200);
  });
});
