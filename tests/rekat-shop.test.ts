import { describe, it, expect } from "vitest";
import {
  bundleSetsFor,
  normalizeCart,
  priceCart,
  isPayment,
  needsPaymentReport,
  FREE_SHIPPING_OVER,
  SHIPPING_FEE,
  MAX_QTY_PER_LINE,
  type CartLine,
} from "../src/app/sites/rekat/_data/shop";
import {
  getBean,
  listBeans,
  PROCESS,
  ROAST,
  UNIT_GRAMS,
  usedRoasts,
} from "../src/app/sites/rekat/_data/beans";
import {
  FAMILY,
  FAMILY_ORDER,
  wheelLabel,
} from "../src/app/sites/rekat/_data/flavor-wheel";
import { makeOrderId, normalizeOrderId } from "../src/lib/shop-order-id";

// 前台顯示的金額與後端寫進資料庫的金額，走的是同一支 priceCart。
// 這份測試守的就是那支函式——它算錯，客人與老闆會同時看到錯的數字。

const line = (slug: string, qty: number): CartLine => ({ slug, qty });

// 第 2 號翡翠莊園綠標：NT$2,000，三包 4,800（每組省 1,200）
const BUNDLED = "esmeralda-green-label";
// 第 9 號耶加雪菲：NT$400，無優惠
const PLAIN = "yirgacheffe-aricha-adorsi";

describe("豆單與紙本一致（2026 九月豆單）", () => {
  // 直接抄自客戶提供的豆單。改價時這張表要跟著改——
  // 它的用途就是讓「不小心改到價格」這件事在 CI 就紅起來。
  const SHEET: [number, string, number, string | null, number | null][] = [
    [1, "極品夏威夷可娜 Extra Fancy 等級", 2000, null, null],
    [2, "空運巴拿馬藝伎 翡翠莊園綠標", 2000, "三包", 4800],
    [3, "空運牙買加藍山 No.1 克里斯戴爾莊園", 1700, "三包", 4500],
    [4, "巴拿馬藝伎 —「90+」Ninety Plus 雙重厭氧", 1200, "特三包", 2700],
    [5, "衣索比亞藝伎 凱蕾莊園", 700, "特三包", 1500],
    [6, "巴拿馬「90+」經典藝伎", 1200, "三包", 3000],
    [7, "最佳巴拿馬藝伎 阿爾鐵里莊園", 1600, "三包", 4200],
    [8, "瓜地馬拉小藍莓莊園藝伎", 1200, "特三包", 2700],
    [9, "衣索比亞耶加雪菲 G1・Aricha Adorsi 處理廠", 400, null, null],
    [10, "衣索比亞 Lucy 藝伎之母", 600, "三包", 1500],
    [11, "肯亞 多門 AA TOP", 400, null, null],
    [12, "蘇門達臘林東藍眼曼特林 G1 TP", 400, null, null],
    [13, "哥倫比亞卡斯提優・天堂水果", 600, "三包", 1500],
    [14, "花神來了 — 瓜地馬拉", 400, null, null],
    [15, "秘魯 SHB・北方之花", 400, null, null],
  ];

  it("共 15 支，編號與紙本對得上", () => {
    expect(listBeans()).toHaveLength(SHEET.length);
    expect(listBeans().map((b) => b.no)).toEqual(SHEET.map((r) => r[0]));
  });

  it.each(SHEET)("第 %i 號 %s：售價與優惠與紙本相符", (no, name, price, label, bundlePrice) => {
    const bean = listBeans().find((b) => b.no === no)!;
    expect(bean.nameZh).toBe(name);
    expect(bean.price).toBe(price);
    if (label === null) {
      expect(bean.bundle, `第 ${no} 號紙本沒有優惠`).toBeUndefined();
    } else {
      expect(bean.bundle?.label).toBe(label);
      expect(bean.bundle?.price).toBe(bundlePrice);
      expect(bean.bundle?.qty).toBe(3);
    }
  });

  it("每個優惠都真的比原價便宜（擋掉打錯的整組價）", () => {
    for (const b of listBeans()) {
      if (!b.bundle) continue;
      expect(b.bundle.price, `${b.slug} 的整組價不該高於原價`).toBeLessThan(
        b.price * b.bundle.qty,
      );
      expect(b.bundle.price).toBeGreaterThan(0);
    }
  });
});

describe("豆單資料本身", () => {
  it("slug 唯一、編號唯一", () => {
    const beans = listBeans();
    expect(new Set(beans.map((b) => b.slug)).size).toBe(beans.length);
    expect(new Set(beans.map((b) => b.no)).size).toBe(beans.length);
  });

  it("價格都是正整數，規格是半磅 227g", () => {
    for (const b of listBeans()) {
      expect(Number.isInteger(b.price), `${b.slug} 的價格應為整數`).toBe(true);
      expect(b.price).toBeGreaterThan(0);
    }
    expect(UNIT_GRAMS).toBe(227);
  });

  it("處理法、烘焙度、風味家族都指得到定義", () => {
    for (const b of listBeans()) {
      expect(PROCESS[b.process], `${b.slug} 的處理法 ${b.process} 不存在`).toBeTruthy();
      expect(ROAST[b.roast], `${b.slug} 的烘焙度 ${b.roast} 不存在`).toBeTruthy();
      expect(b.families.length, `${b.slug} 至少要有一個風味家族`).toBeGreaterThan(0);
      for (const f of b.families) expect(FAMILY[f], `${b.slug} 的家族 ${f} 不存在`).toBeTruthy();
      expect(b.notes.length, `${b.slug} 應有風味描述`).toBeGreaterThan(0);
    }
  });

  it("烘焙度由淺到深排序，且沒有深焙（產地風味會被燒掉）", () => {
    expect(usedRoasts().map((r) => r.key)).toEqual(["light", "light-medium", "medium"]);
    expect(usedRoasts().reduce((a, r) => a + r.count, 0)).toBe(15);
  });
});

describe("三包優惠", () => {
  const bean = getBean(BUNDLED)!;
  const savePerSet = bean.price * 3 - bean.bundle!.price; // 6000 − 4800 = 1200

  it.each([
    [1, 0],
    [2, 0],
    [3, 1],
    [5, 1],
    [6, 2],
    [8, 2],
    [9, 3],
  ])("買 %i 包成立 %i 組", (qty, sets) => {
    expect(bundleSetsFor(bean, qty)).toBe(sets);
  });

  it("沒有優惠的豆子永遠湊不出組", () => {
    expect(bundleSetsFor(getBean(PLAIN)!, 9)).toBe(0);
  });

  it("剛好三包＝整組價，行金額仍是原價乘法，折抵獨立成一列", () => {
    const t = priceCart([line(BUNDLED, 3)], "transfer");
    // 每一行都還是「數量 × 單價」，方便跟紙本核對
    expect(t.lines[0]!.amount).toBe(6000);
    expect(t.listTotal).toBe(6000);
    // 折抵另外列一條
    expect(t.bundles).toHaveLength(1);
    expect(t.bundles[0]!.sets).toBe(1);
    expect(t.bundles[0]!.saved).toBe(savePerSet);
    expect(t.subtotal).toBe(bean.bundle!.price);
  });

  it("湊不滿一組的餘數以原價計（7 包 = 2 組 + 1 包原價）", () => {
    const t = priceCart([line(BUNDLED, 7)], "transfer");
    expect(t.bundles[0]!.sets).toBe(2);
    expect(t.subtotal).toBe(bean.bundle!.price * 2 + bean.price);
  });

  it("同一支豆子重複加入會併成一行再湊組", () => {
    const t = priceCart([line(BUNDLED, 2), line(BUNDLED, 1)], "transfer");
    expect(t.lines).toHaveLength(1);
    expect(t.lines[0]!.qty).toBe(3);
    expect(t.bundles).toHaveLength(1);
    expect(t.subtotal).toBe(bean.bundle!.price);
  });

  it("每一行都算得出「還差幾包湊滿下一組」（購物車的提示靠這個）", () => {
    expect(priceCart([line(BUNDLED, 1)], "transfer").lines[0]!.toNextBundle).toBe(2);
    expect(priceCart([line(BUNDLED, 2)], "transfer").lines[0]!.toNextBundle).toBe(1);
    expect(priceCart([line(BUNDLED, 3)], "transfer").lines[0]!.toNextBundle).toBe(0);
    expect(priceCart([line(BUNDLED, 4)], "transfer").lines[0]!.toNextBundle).toBe(2);
    // 沒有優惠的豆子不該顯示任何進度
    expect(priceCart([line(PLAIN, 2)], "transfer").lines[0]!.toNextBundle).toBe(0);
  });

  it("不同豆子不會互相湊組", () => {
    const t = priceCart([line(BUNDLED, 2), line("blue-mountain-clydesdale", 1)], "transfer");
    expect(t.bundles).toHaveLength(0);
    expect(t.subtotal).toBe(t.listTotal);
  });

  it("多支同時成組時，折抵多的排前面", () => {
    const t = priceCart(
      [line(BUNDLED, 3), line("ethiopia-lucy-gesha", 3)],
      "transfer",
    );
    expect(t.bundles).toHaveLength(2);
    expect(t.bundles[0]!.saved).toBeGreaterThanOrEqual(t.bundles[1]!.saved);
    expect(t.discount).toBe(t.bundles.reduce((a, b) => a + b.saved, 0));
  });

  it("購物車包數等於出貨包數（優惠不會偷偷多送一包）", () => {
    const t = priceCart([line(BUNDLED, 3)], "transfer");
    expect(t.count).toBe(3);
    expect(t.lines[0]!.qty).toBe(3);
  });
});

describe("購物車結算", () => {
  it("空車不收運費", () => {
    const t = priceCart([], "cod");
    expect(t.total).toBe(0);
    expect(t.shippingFee).toBe(0);
  });

  it("未達免運門檻要收運費", () => {
    const t = priceCart([line(PLAIN, 1)], "transfer");
    expect(t.subtotal).toBe(400);
    expect(t.shippingFee).toBe(SHIPPING_FEE);
    expect(t.total).toBe(400 + SHIPPING_FEE);
  });

  it("達門檻免運（門檻本身算達到）", () => {
    const t = priceCart([line(PLAIN, 5)], "transfer"); // 400 × 5 = 2000
    expect(t.subtotal).toBe(FREE_SHIPPING_OVER);
    expect(t.shippingFee).toBe(0);
  });

  it("免運看的是折抵後的小計，不是定價總額", () => {
    // 第 5 號凱蕾：700 × 3 = 2100 定價（過門檻），特三包後只剩 1500（未過門檻）。
    // 客人實付 1500，就該收運費——用定價判斷會白送一趟運費。
    const t = priceCart([line("ethiopia-gesha-kaile", 3)], "transfer");
    expect(t.listTotal).toBe(2100);
    expect(t.subtotal).toBe(1500);
    expect(t.shippingFee).toBe(SHIPPING_FEE);
    expect(t.total).toBe(1500 + SHIPPING_FEE);
  });

  it("兩種付款方式都不加收費用（貨到付款免手續費）", () => {
    const cod = priceCart([line(PLAIN, 1)], "cod");
    const tr = priceCart([line(PLAIN, 1)], "transfer");
    expect(cod.total).toBe(tr.total);
  });

  it("金額一律取自豆單，不信任外部傳入的價格", () => {
    const t = priceCart(
      [{ ...line(PLAIN, 2), unitPrice: 1, amount: 1 } as unknown as CartLine],
      "transfer",
    );
    expect(t.lines[0]!.unitPrice).toBe(400);
    expect(t.lines[0]!.amount).toBe(800);
  });
});

describe("付款方式", () => {
  it("只認得兩種，其餘一律拒絕（LINE Pay 已於 2026-09-02 移除）", () => {
    expect(isPayment("transfer")).toBe(true);
    expect(isPayment("cod")).toBe(true);
    expect(isPayment("linepay")).toBe(false);
    expect(isPayment("free")).toBe(false);
    expect(isPayment(null)).toBe(false);
  });

  it("匯款要回報末五碼，貨到付款不用", () => {
    expect(needsPaymentReport("transfer")).toBe(true);
    expect(needsPaymentReport("cod")).toBe(false);
  });
});

describe("購物車正規化（客人瀏覽器裡的 localStorage 不可信）", () => {
  it("丟掉不存在的 slug", () => {
    const out = normalizeCart([line("no-such-bean", 2), line(PLAIN, 1)]);
    expect(out).toEqual([{ slug: PLAIN, qty: 1 }]);
  });

  it("丟掉零、負數與非數字的數量", () => {
    expect(normalizeCart([line(PLAIN, 0), line(PLAIN, -3)])).toEqual([]);
    expect(normalizeCart([{ slug: PLAIN, qty: NaN }])).toEqual([]);
  });

  it("同一支豆子會合併成一行", () => {
    expect(normalizeCart([line(PLAIN, 2), line(PLAIN, 3)])).toEqual([{ slug: PLAIN, qty: 5 }]);
  });

  it("舊版購物車裡殘留的 grind 欄位不會讓結算爆掉", () => {
    // 拿掉研磨度之前存進 localStorage 的資料，客人的瀏覽器裡還躺著
    const legacy = [
      { slug: PLAIN, grind: "whole", qty: 2 },
      { slug: PLAIN, grind: "pourover", qty: 1 },
    ] as unknown as CartLine[];
    expect(normalizeCart(legacy)).toEqual([{ slug: PLAIN, qty: 3 }]);
  });

  it("數量有上限，擋掉 999 包這種輸入", () => {
    expect(normalizeCart([line(PLAIN, 9999)])[0]!.qty).toBe(MAX_QTY_PER_LINE);
  });

  it("下架的豆子被安靜略過，不會讓整車結算失敗", () => {
    const t = priceCart([line("no-such-bean", 1), line(PLAIN, 1)], "transfer");
    expect(t.lines).toHaveLength(1);
    expect(t.subtotal).toBe(400);
  });
});

describe("訂單編號", () => {
  it("格式為 RK + 台北日期 + 4 碼，且不含易認錯的字元", () => {
    const id = makeOrderId("RK", new Date("2026-09-02T10:00:00Z"));
    expect(id).toMatch(/^RK260902-[23456789ACDEFGHJKMNPQRSTVWXYZ]{4}$/);
  });

  it("日期用台北時區，不是 UTC", () => {
    // UTC 是 9/1 20:00，台北已經是 9/2 04:00
    expect(makeOrderId("RK", new Date("2026-09-01T20:00:00Z")).startsWith("RK260902-")).toBe(true);
  });

  it("同一天產生的編號不會重複（尾碼是亂數）", () => {
    const d = new Date("2026-09-02T10:00:00Z");
    const ids = new Set(Array.from({ length: 400 }, () => makeOrderId("RK", d)));
    expect(ids.size).toBeGreaterThan(395);
  });

  it("查詢時容忍小寫與空白", () => {
    expect(normalizeOrderId("  rk260902-k7qx ")).toBe("RK260902-K7QX");
  });
});

describe("風味輪", () => {
  const families = Object.values(FAMILY);

  it("九大家族齊全，順序表與定義表對得起來", () => {
    expect(families).toHaveLength(9);
    expect(new Set(FAMILY_ORDER).size).toBe(9);
    for (const k of FAMILY_ORDER) expect(FAMILY[k]).toBeTruthy();
  });

  // 輪子上的字是畫進色帶裡的，不是排版排出來的：內圈可用約 36px、外圈約 32px，
  // 中文字寬約等於字級。超過四個字就會撞出色帶外緣（量測過），
  // 所以長名字必須另外給 short，全名留在右側說明面板。
  it("畫在輪子上的標最多四個字（超過會撐破色帶）", () => {
    for (const f of families) {
      expect(wheelLabel(f).length, `家族「${f.zh}」的輪標過長，請補 short`).toBeLessThanOrEqual(4);
      for (const c of f.children) {
        expect(wheelLabel(c).length, `描述詞「${c.zh}」的輪標過長，請補 short`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("縮寫只影響輪子，說明面板仍是完整名稱", () => {
    const fermented = FAMILY["sour-fermented"];
    expect(wheelLabel(fermented)).toBe("發酵");
    expect(fermented.zh).toBe("酸香／發酵");
  });

  it("每個家族都有中英文與至少一個第二層描述詞", () => {
    for (const f of families) {
      expect(f.zh).toBeTruthy();
      expect(f.en).toBeTruthy();
      expect(f.gist.length).toBeGreaterThan(10);
      expect(f.children.length).toBeGreaterThan(0);
      for (const c of f.children) {
        expect(c.zh).toBeTruthy();
        expect(c.en).toBeTruthy();
      }
    }
  });
});

describe("運費與付款（2026-09-02 客戶確認）", () => {
  it("運費 160、滿 2000 免運、貨到付款免手續費", () => {
    expect(SHIPPING_FEE).toBe(160);
    expect(FREE_SHIPPING_OVER).toBe(2000);
    // 兩種付款方式的總額必須一致——貨到付款不再加收
    const a = priceCart([line(PLAIN, 1)], "cod");
    const b = priceCart([line(PLAIN, 1)], "transfer");
    expect(a.total).toBe(b.total);
    expect(a.total).toBe(400 + 160);
  });

  it("Totals 不再有 codFee 欄位（欄位與資料庫欄都已移除）", () => {
    expect("codFee" in priceCart([line(PLAIN, 1)], "cod")).toBe(false);
  });
});
