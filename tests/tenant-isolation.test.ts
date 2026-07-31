import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

// 結構性測試：直接掃原始碼，守住「跨租戶越權」這條最容易在日後改動中漏掉的線。
// 成本極低，但它擋的是行為測試很難窮舉的東西——某天有人在 portal 頁面裡
// 直接寫一行 prisma.inquiry.findMany({ where: { id } })，這裡會立刻紅。

const ROOT = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const read = (p: string) => readFileSync(p, "utf8");
const rel = (p: string) => path.relative(ROOT, p);

/** 去掉註解再掃：本檔的規則都寫在註解裡，不能讓說明文字本身觸發告警 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PORTAL_DIRS = ["src/app/portal", "src/app/api/portal"];
const DATA_LAYER = path.join(ROOT, "src/lib/tenant-data.ts");

describe("portal 只能透過 tenant-data.ts 存取資料", () => {
  const files = PORTAL_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

  it("掃描到的檔案數合理（防止路徑寫錯導致測試空跑）", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(PORTAL_DIRS)("%s 底下不得直接使用 prisma", (dir) => {
    const offenders = walk(path.join(ROOT, dir))
      .filter((f) => /\bprisma\s*\./.test(code(f)))
      .map(rel);
    expect(offenders, "請改走 src/lib/tenant-data.ts").toEqual([]);
  });

  it("狀態變更的 API 都做了 sameOrigin 檢查（cookie 是 sameSite:lax）", () => {
    const posts = walk(path.join(ROOT, "src/app/api/portal")).filter((f) =>
      /export async function POST/.test(code(f)),
    );
    expect(posts.length).toBeGreaterThanOrEqual(3);
    for (const f of posts) {
      expect(code(f), `${rel(f)} 缺少 sameOrigin 檢查`).toMatch(/sameOrigin\(req\)/);
    }
  });

  it("讀取資料的 API 都取用 session（不可只靠 Host）", () => {
    for (const f of walk(path.join(ROOT, "src/app/api/portal"))) {
      const src = code(f);
      // login 本身就是還沒有 session 的時候呼叫的，豁免
      if (/portal\/login/.test(rel(f)) || /portal\/logout/.test(rel(f))) continue;
      expect(src, `${rel(f)} 應呼叫 getTenantSession`).toMatch(/getTenantSession\(\)/);
    }
  });

  it("portal 頁面都是 force-dynamic（避免快取到別人的資料）", () => {
    for (const f of walk(path.join(ROOT, "src/app/portal"))) {
      if (!/page\.tsx$/.test(f)) continue;
      expect(code(f), `${rel(f)} 缺少 force-dynamic`).toMatch(
        /export const dynamic\s*=\s*"force-dynamic"/,
      );
    }
  });
});

describe("tenant-data.ts 的租戶範圍不可繞過", () => {
  const src = code(DATA_LAYER);

  it("禁用 findUnique / update / delete（where 塞不進 tenantId）", () => {
    for (const banned of ["findUnique", ".update(", ".delete(", "deleteMany", "$queryRaw", "$executeRaw"]) {
      expect(src.includes(banned), `不應出現 ${banned}`).toBe(false);
    }
  });

  it("每個 export function 的第一個參數都是 tenantId", () => {
    const fns = [...src.matchAll(/export (?:async )?function (\w+)\(\s*([^,)]*)/g)];
    expect(fns.length).toBeGreaterThanOrEqual(5);
    for (const [, name, firstParam] of fns) {
      expect(firstParam.trim(), `${name} 的第一個參數應為 tenantId`).toMatch(/^tenantId\b/);
    }
  });

  it("每次 prisma.inquiry.* 呼叫附近都出現 tenantId", () => {
    const calls = [...src.matchAll(/prisma\.inquiry\.\w+\(/g)];
    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const m of calls) {
      const window = src.slice(m.index!, m.index! + 260);
      expect(window, `此處缺少 tenantId 範圍：${window.slice(0, 60)}`).toMatch(/tenantId/);
    }
  });

  it("setHandled 用 count 當授權判斷（而非只看有無例外）", () => {
    expect(src).toMatch(/updateMany/);
    expect(src).toMatch(/count === 1/);
  });
});

describe("portal 不得被邊緣快取", () => {
  it("next.config.ts 的 Cache-Control 規則排除了 /portal 與 /admin", () => {
    const cfg = code(path.join(ROOT, "next.config.ts"));
    expect(cfg).toMatch(/\(\?!portal\)/);
    expect(cfg).toMatch(/\(\?!admin\)/);
  });
});
