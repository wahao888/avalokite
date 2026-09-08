import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
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

/**
 * 租戶資料層。每加一個電商型客戶站就多一個檔，下面所有規則會逐檔套用。
 *
 * 不合併成一個檔的理由：tenant-data.ts 已經是兩個功能約 200 行，
 * 再把代購的十張表塞進去只會變成沒人敢動的巨獸。規則本身不因為拆檔而變弱——
 * describe.each 會對每一個檔跑一模一樣的檢查。
 */
const DATA_LAYERS = ["src/lib/tenant-data.ts", "src/lib/daigou-data.ts"];

/**
 * src/lib 底下允許 import prisma 的檔案。
 *
 * 這條規則擋的是「有人偷偷新增第三個資料層」——那個檔不在 DATA_LAYERS 裡，
 * 上面那些規則就掃不到它，等於整套租戶範圍的保證被繞過去了。
 * ecpay-process 與 subscription 是 Avalo 自己的金流與訂閱，本來就不分租戶。
 */
const LIB_PRISMA_ALLOWED = [
  "src/lib/prisma.ts",
  "src/lib/tenant-data.ts",
  "src/lib/daigou-data.ts",
  "src/lib/ecpay-process.ts",
  "src/lib/subscription.ts",
];

describe("portal 只能透過資料層存取資料", () => {
  const files = PORTAL_DIRS.flatMap((d) => walk(path.join(ROOT, d)));

  it("掃描到的檔案數合理（防止路徑寫錯導致測試空跑）", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(PORTAL_DIRS)("%s 底下不得直接使用 prisma", (dir) => {
    const offenders = walk(path.join(ROOT, dir))
      .filter((f) => /\bprisma\s*\./.test(code(f)))
      .map(rel);
    expect(offenders, "請改走 src/lib 的租戶資料層").toEqual([]);
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

describe.each(DATA_LAYERS)("%s 的租戶範圍不可繞過", (layer) => {
  const src = code(path.join(ROOT, layer));

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

  /**
   * 原本這條寫死 prisma.inquiry.*，所以 shopOrder 與後來新增的每一張表
   * 其實都沒有被守到。改成通用比對，並把交易內的 tx.* 一起納入——
   * 交易裡的寫入同樣可能忘記帶租戶範圍。
   */
  it("每次 prisma / tx 呼叫附近都出現 tenantId", () => {
    const calls = [...src.matchAll(/(?:prisma|tx)\.\w+\.\w+\(/g)];
    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const m of calls) {
      const window = src.slice(m.index!, m.index! + 320);
      expect(window, `此處缺少 tenantId 範圍：${window.slice(0, 60)}`).toMatch(/tenantId/);
    }
  });

  /**
   * 新增的規則。原本完全沒有規則管 create——上面那條「where 要帶 tenantId」
   * 只管得到查詢與更新，而 create 沒有 where。
   * 全 CRUD 的後台（代購站要能新增商品）一進來，這就是唯一的真破口。
   */
  it("每個 create / createMany 的 data 都帶 tenantId", () => {
    for (const m of src.matchAll(/\.create(?:Many)?\(/g)) {
      const window = src.slice(m.index!, m.index! + 400);
      expect(window, `create 未帶 tenantId：${window.slice(0, 80)}`).toMatch(/tenantId/);
    }
  });

  it("以 count 當授權判斷（而非只看有無例外）", () => {
    expect(src).toMatch(/updateMany/);
    expect(src).toMatch(/count === 1/);
  });
});

describe("資料層不可被偷偷新增", () => {
  it("src/lib 底下 import prisma 的檔案必須都在允許清單裡", () => {
    const offenders = walk(path.join(ROOT, "src/lib"))
      .filter((f) => /from ["']\.\/prisma["']|from ["']@\/lib\/prisma["']/.test(code(f)))
      .map(rel)
      .filter((f) => !LIB_PRISMA_ALLOWED.includes(f));
    expect(
      offenders,
      "新的租戶資料層要一併加進 DATA_LAYERS，否則上面的規則掃不到它",
    ).toEqual([]);
  });

  it("允許清單裡的檔案都真的存在（清單過期會讓規則空轉）", () => {
    for (const f of LIB_PRISMA_ALLOWED) {
      expect(existsSync(path.join(ROOT, f)), `${f} 不存在`).toBe(true);
    }
  });
});

describe("代購站的公開 API 不得直接碰資料庫", () => {
  const dir = path.join(ROOT, "src/app/api/amber");

  it("src/app/api/amber 底下一律走 daigou-data.ts", () => {
    if (!existsSync(dir)) return; // 尚未建立；建立後這條自動生效
    const offenders = walk(dir)
      .filter((f) => /\bprisma\s*\./.test(code(f)))
      .map(rel);
    expect(
      offenders,
      "公開下單是全系統價值最高的寫入，必須走資料層",
    ).toEqual([]);
  });
});

describe("代購 schema 的租戶範圍", () => {
  const schema = readFileSync(path.join(ROOT, "prisma/schema.prisma"), "utf8");
  const models = [...schema.matchAll(/^model (Dg\w+) \{([\s\S]*?)^\}/gm)];

  it("掃得到十張 Dg 表（防止正則寫錯導致空跑）", () => {
    expect(models.length).toBe(10);
  });

  it("每一張都宣告 tenantId", () => {
    for (const [, name, body] of models) {
      expect(body, `${name} 缺少 tenantId`).toMatch(/^\s*tenantId\s+String/m);
    }
  });

  /**
   * upsert 的 where 只吃唯一鍵。唯一鍵若不帶 tenantId，
   * upsert 就變成一個繞過租戶範圍的後門；而且跨租戶還會互相撞名
   * （A 租戶可以把 B 想用的 slug 佔走，那是一種 DoS）。
   */
  it("每個 @@unique 都以 tenantId 開頭", () => {
    let seen = 0;
    for (const [, name, body] of models) {
      for (const m of body.matchAll(/@@unique\(\[([^\]]+)\]\)/g)) {
        seen += 1;
        const first = m[1].split(",")[0].trim();
        expect(first, `${name} 的 @@unique 應以 tenantId 開頭`).toBe("tenantId");
      }
    }
    expect(seen).toBeGreaterThanOrEqual(8);
  });

  it("每個 @@index 也以 tenantId 開頭（查詢一律先收斂到單一租戶）", () => {
    for (const [, name, body] of models) {
      for (const m of body.matchAll(/@@index\(\[([^\]]+)\]\)/g)) {
        const first = m[1].split(",")[0].trim();
        expect(first, `${name} 的 @@index 應以 tenantId 開頭`).toBe("tenantId");
      }
    }
  });
});

describe("上傳檔案不可落在 repo 樹內", () => {
  /**
   * deploy 的 rsync --delete 會刪掉任何寫進 repo 樹的執行期檔案
   * （2026-07-30 就是這樣把 prod.db 整個刪掉過一次）。
   * 商品照片沒有 .db 那種每日備份，掉了就真的沒了。
   *
   * 同時這條也讓「換 S3 只要改一個檔」變成被檢查的性質，而不是願望。
   */
  it("/var/www/avalo-uploads 只出現在 local-disk.ts 與 deploy/ 底下", () => {
    const allowed = ["src/lib/storage/local-disk.ts"];
    // 用去註解的版本掃：規則講的是「程式碼不得寫死這個路徑」，
    // 而說明這條規則的註解本身一定會提到它（storage/types.ts 就是）。
    const offenders = walk(path.join(ROOT, "src"))
      .filter((f) => code(f).includes("/var/www/avalo-uploads"))
      .map(rel)
      .filter((f) => !allowed.includes(f));
    expect(offenders, "上傳路徑只能住在儲存實作裡").toEqual([]);
  });

  it("儲存介面的方法叫 remove 不叫 delete", () => {
    // 圖片清掃程序必須跟「標記 purgedAt」寫在一起才有交易性，所以它住在資料層；
    // 若這個方法叫 delete，上面那條 `.delete(` 的禁令會在一行完全正確的
    // 程式碼上紅掉。掃描器的笨正是它的價值，所以是這裡改名，不是那裡加例外。
    const iface = code(path.join(ROOT, "src/lib/storage/types.ts"));
    expect(iface).toMatch(/remove\(key: string\)/);
    expect(iface.includes("delete(key")).toBe(false);
  });
});

describe("快取設定", () => {
  const cfg = code(path.join(ROOT, "next.config.ts"));

  it("next.config.ts 的 Cache-Control 規則排除了 /portal 與 /admin", () => {
    expect(cfg).toMatch(/\(\?!portal\)/);
    expect(cfg).toMatch(/\(\?!admin\)/);
  });

  /**
   * 標頭比對看到的是改寫前的路徑（/p/xxx），沒辦法用 source 區分租戶，
   * 所以代購站要用 host 規則整站 no-store。
   * 少了這條、又哪天掛上 CDN，一個已截止的商品頁可以繼續顯示「立即購買」
   * 長達 24 小時（s-maxage=300 + stale-while-revalidate=86400），
   * 而結單頁 /s/<token> 是逐客人的金額與收件資料，更不能進共用快取。
   */
  it("代購站整站 no-store（host 規則）", () => {
    expect(cfg).toMatch(/AMBER_HOST/);
    expect(cfg).toMatch(/no-store/);
    expect(cfg).toMatch(/missing:\s*\[\{\s*type:\s*"host"/);
  });
});

describe("nginx 的上傳相關設定", () => {
  const conf = readFileSync(path.join(ROOT, "deploy/nginx.conf"), "utf8");

  it("上傳大小上限維持 2m", () => {
    // 前端會先把照片壓到 1600px / 約 300KB，而且一次只傳一張，
    // 所以 2m 綽綽有餘。這條測試擋的是「為了讓上傳能動而調高上限」——
    // 真的傳不動一定是前端壓縮壞了，不是這個數字太小。
    expect(conf).toMatch(/client_max_body_size\s+2m;/);
  });

  it("有 /u/ 的 location，且用 ^~ 讓它勝過 regex location", () => {
    expect(conf).toMatch(/location\s+\^~\s+\/u\/\s*\{/);
    expect(conf).toMatch(/alias\s+\/var\/www\/avalo-uploads\/;/);
    // ⚠ 上傳目錄不能放回 /opt/avalo 底下。那個目錄是 750 avalo:avalo，
    // nginx 跑在 www-data 穿不進去，商品照會全部回 403；而要讓它進得來
    // 就得對 /opt/avalo 開 o+x，那底下有 backups/（資料庫備份）與
    // prod.db（644），等於為了送圖片把正式資料庫攤開。2026-09-08 上線前發現。
    expect(conf, "上傳目錄不可放在 /opt/avalo 底下").not.toMatch(/alias\s+\/opt\/avalo/);
  });

  it("/u/ 自己補回安全標頭（本層一有 add_header 就不繼承上層）", () => {
    const block = conf.slice(conf.indexOf("location ^~ /u/"));
    const end = block.indexOf("\n    }");
    const body = block.slice(0, end);
    expect(body).toMatch(/X-Content-Type-Options\s+nosniff/);
    expect(body).toMatch(/Content-Security-Policy/);
    expect(body).toMatch(/immutable/);
  });
});
