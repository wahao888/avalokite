import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import { FEATURES, TRUST_CHIPS, SITE_NAV, FOOT_HELP, FOOT_SHOP } from "@/app/sites/amber/_data/nav";

// 代購站前台的結構性測試。
//
// 這裡守的是**設計決策**，不是商業邏輯（那些在 amber-shop.test.ts）。
// 每一條都對應一個「改壞了不會有人立刻發現」的性質：
// 主題預設值被 media query 悄悄改掉、圖示名稱打錯後無聲退成星芒、
// 導覽多了一頁但頁尾沒跟上。全部只掃原始碼，成本接近零。

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "src/app/sites/amber");

const read = (p: string) => readFileSync(p, "utf8");

/** 去掉註解再掃：說明文字本身不該觸發告警 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

describe("深淺色：預設是淺色", () => {
  const css = read(path.join(SITE_DIR, "amber.css"));

  it("樣式表裡沒有 prefers-color-scheme", () => {
    // 客戶要求「預設淺色，可以切換」。只要有一條 prefers-color-scheme，
    // 系統設深色的人就會拿到深色——那就不是「預設淺色」了。
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it("基準 :root 帶著淺色的紙張色，深色只在 [data-theme=\"dark\"] 底下", () => {
    expect(css).toMatch(/:root\s*\{[\s\S]*?--a-paper:\s*#faf9f6/);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*\{/);
  });

  it("開機腳本只認得 \"dark\"，其餘一律落到淺色", () => {
    const toggle = read(path.join(SITE_DIR, "_components/ThemeToggle.tsx"));
    // 寫成 t==="dark"?"dark":"light" 才有這個性質。
    // 反過來寫（t==="light"?"light":"dark"）就會變成預設深色。
    expect(toggle).toMatch(/t\s*===\s*"dark"\s*\?\s*"dark"\s*:\s*"light"/);
    // catch 裡也要退回淺色，不能什麼都不做
    expect(toggle).toMatch(/catch[\s\S]{0,80}dataset\.theme\s*=\s*"light"/);
  });

  it("layout 對 <html> 標了 suppressHydrationWarning", () => {
    // 開機腳本在 React 之前就改了 <html> 的屬性，伺服器不可能知道
    // 這台裝置存了什麼偏好。少了這個標記，每一頁都會噴 hydration 警告。
    const layout = code(path.join(SITE_DIR, "layout.tsx"));
    expect(layout).toMatch(/<html[^>]*suppressHydrationWarning/);
  });
});

describe("圖示", () => {
  const icons = read(path.join(SITE_DIR, "_components/Icons.tsx"));

  /** Icons.tsx 的 BY_NAME 對照表裡列了哪些 key */
  const registered = (() => {
    const block = icons.match(/const BY_NAME[\s\S]*?\n\};/)?.[0] ?? "";
    return new Set([...block.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]));
  })();

  it("BY_NAME 有被解析到（防止正則寫錯導致測試空跑）", () => {
    expect(registered.size).toBeGreaterThanOrEqual(15);
  });

  it("_data/nav.ts 用到的每個圖示名稱都註冊過", () => {
    // NamedIcon 找不到名稱時會無聲退成星芒——四張服務特點卡
    // 會變成四顆一模一樣的星星，而且不會有任何錯誤。
    const used = [...FEATURES.map((f) => f.icon), ...TRUST_CHIPS.map((c) => c.icon)];
    const missing = used.filter((n) => !registered.has(n));
    expect(missing, "這些名稱在 Icons.tsx 的 BY_NAME 裡找不到").toEqual([]);
  });

  it("每個分類都有自己的圖示", () => {
    const block = icons.match(/const CATEGORY_ICONS[\s\S]*?\n\};/)?.[0] ?? "";
    for (const key of ["women", "men", "shoes", "accessory", "beauty", "food", "instock"]) {
      expect(block, `分類 ${key} 沒有配圖示`).toContain(`${key}:`);
    }
  });

  it("前台看得到的地方沒有 emoji", () => {
    // 客戶要求用圖示不要用 emoji：emoji 在每個系統長得都不一樣、
    // 大小顏色不受控，而且一律是彩色的，深色模式下會蓋過價格與倒數。
    //
    // _data/notify-text.ts 例外——那些字串是 Amber 複製去貼在 LINE 的
    // **訊息內容**，不是網站介面，LINE 訊息裡有 emoji 是自然的。
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2705}\u{2713}\u{2714}\u{2716}\u{274C}\u{2B50}]/u;
    const offenders = walk(SITE_DIR)
      .filter((f) => !f.endsWith("_data/notify-text.ts"))
      .filter((f) => emoji.test(code(f)))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});

describe("hero 的動態", () => {
  const css = read(path.join(SITE_DIR, "amber.css"));
  const art = read(path.join(SITE_DIR, "_components/HeroArt.tsx"));

  it("CSS 的 offset-path 跟 HeroArt 的 FLIGHT_PATH 是同一條線", () => {
    // 飛機用 CSS 的 offset-path 沿著 SVG 裡那條航線飛。兩邊各存一份字串，
    // 改了其中一份就會出現「飛機沿著一條看不見的線飛過空白處」——
    // 而且畫面上不會有任何錯誤，只有看起來怪。
    const inTsx = art.match(/FLIGHT_PATH = "([^"]+)"/)?.[1];
    expect(inTsx, "HeroArt.tsx 找不到 FLIGHT_PATH").toBeTruthy();
    expect(css, "amber.css 的 offset-path 與 FLIGHT_PATH 不一致").toContain(
      `offset-path: path("${inTsx}")`,
    );
  });

  it("offset-path 包在 @supports 裡", () => {
    // 不支援的瀏覽器會把元素留在原點（插畫左上角），看起來像壞掉。
    expect(css).toMatch(/@supports \(offset-path:[\s\S]{0,400}\.am-hero__plane/);
  });

  it("減少動態效果時，插畫的動畫是整個關掉而不是壓成 0.01ms", () => {
    // 壓成 0.01ms 會讓動畫跳到最後一幀，而星芒的最後一幀是半透明又縮小的。
    const block = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/)?.[0] ?? "";
    expect(block).toMatch(/\.am-hero__spark[\s\S]{0,120}animation:\s*none/);
  });
});

describe("導覽", () => {
  it("頁首的每一頁在檔案系統裡都有對應的 page.tsx", () => {
    // 導覽多一頁但忘了建檔，客人點下去就是 404。
    for (const l of SITE_NAV) {
      const p = path.join(SITE_DIR, l.href.replace(/^\//, ""), "page.tsx");
      expect(() => statSync(p), `${l.href} 沒有對應的頁面`).not.toThrow();
    }
  });

  it("頁尾的說明頁也都存在", () => {
    for (const l of [...FOOT_HELP, ...FOOT_SHOP]) {
      if (l.href === "/") continue;
      const p = path.join(SITE_DIR, l.href.replace(/^\//, ""), "page.tsx");
      expect(() => statSync(p), `${l.href} 沒有對應的頁面`).not.toThrow();
    }
  });

  it("規範與隱私權在頁尾找得到（它們不該只出現在結帳流程裡）", () => {
    const hrefs = FOOT_HELP.map((l) => l.href);
    expect(hrefs).toContain("/terms");
    expect(hrefs).toContain("/privacy");
  });
});

describe("後台不會替她猜檔期", () => {
  const PORTAL = path.join(ROOT, "src/app/portal/amber");

  it("資料層沒有「回傳單一進行中檔期」的函式", () => {
    // 曾經有一支 currentBatch()，回 status=open 裡最新開的那一檔。
    // 它連續害了兩處：前台只列得出一檔，後台則把商品寫進**錯的檔期**。
    // 問題不在呼叫端，在於這個契約本身就是「從多個裡挑一個，別問是哪個」。
    const data = read(path.join(ROOT, "src/lib/daigou-data.ts"));
    expect(data).not.toMatch(/export async function currentBatch/);
  });

  it("上架與代客下單都會在多檔同開時先問她", () => {
    // 這兩頁是唯一「猜錯就會把資料寫進錯的檔期」的地方。
    // 猜錯不會報錯——收單時間、到貨日、結單分組、運費一起錯，
    // 要到結單那天才看得出來。
    for (const f of ["products/new/page.tsx", "orders/new/page.tsx"]) {
      const src = code(path.join(PORTAL, f));
      expect(src, `${f} 沒有引入 BatchPicker`).toMatch(/BatchPicker/);
      // 而且必須是「大於一檔才問」，不是無條件問（只開一檔時多一次點擊）
      expect(src, `${f} 的多檔判斷不見了`).toMatch(/openList\.length > 1/);
    }
  });

  it("後台首頁在多檔同開時不會只推一檔", () => {
    const src = code(path.join(PORTAL, "page.tsx"));
    expect(src).toMatch(/open\.length === 1/);
    expect(src).toMatch(/open\.length > 1/);
  });
});

describe("檔期被移除後，商品不該還買得到", () => {
  const data = read(path.join(ROOT, "src/lib/daigou-data.ts"));

  /** 抓出某個 export function 的內容（到下一個 export 為止） */
  const body = (name: string) => {
    const i = data.indexOf(`export async function ${name}`);
    expect(i, `找不到 ${name}`).toBeGreaterThan(-1);
    const next = data.indexOf("\nexport ", i + 1);
    return data.slice(i, next === -1 ? undefined : next);
  };

  // 移除一檔連線時，商品自己的 deletedAt 仍然是 null——她刪的是整趟，
  // 不是逐件商品。所以每一個對客人開放的讀取都必須自己檢查檔期還在，
  // 否則商品網址照樣打得開、購物車照樣算得出價、訂單照樣送得出去。
  it.each(["getProductBySlug", "loadPricing", "createDaigouOrder"])(
    "%s 會要求檔期未被移除",
    (fn) => {
      expect(body(fn)).toContain("batch: { deletedAt: null }");
    },
  );

  it("購物車定價與下單的商品條件一致", () => {
    // 兩邊不一致會出現「購物車算得出價、送出卻查無此物」，
    // 或更糟的反過來：購物車擋了、下單卻放行。
    const cond = /where: \{ tenantId, id: \{ in: productIds \}, deletedAt: null, batch: \{ deletedAt: null \} \}/g;
    expect(data.match(cond)?.length, "loadPricing 與 createDaigouOrder 的條件不一致").toBe(2);
  });
});

describe("手機版維持功能優先", () => {
  const css = read(path.join(SITE_DIR, "amber.css"));

  it("hero 在手機上是 display:none，桌機才打開", () => {
    // 客人是從 LINE 群組點連結進來看商品的。
    // 一個 400px 高的 hero 會把商品整個推到摺線下面。
    expect(css).toMatch(/\.am-hero\s*\{\s*display:\s*none;/);
    expect(css).toMatch(/@media \(min-width: 900px\)[\s\S]*\.am-hero\s*\{\s*\n?\s*display:\s*block/);
  });

  it("雙欄骨架在手機上是 display:contents", () => {
    // .am-buybar 的 position:sticky 需要父層夠高才黏得住；
    // 包在一個高度只有它自己的 <aside> 裡，手機版的結帳鈕會沉到頁尾。
    expect(css).toMatch(/\.am-cols__side\s*\{\s*display:\s*contents;\s*\}/);
  });
});
