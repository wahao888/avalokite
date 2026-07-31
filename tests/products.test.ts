import { describe, it, expect } from "vitest";
import {
  PRODUCTS,
  withTax,
  getProduct,
  oneTimeProducts,
  monthlyProducts,
  plansUsingCare,
  promoProducts,
} from "../src/lib/products";

describe("withTax（5% 營業稅，四捨五入）", () => {
  it("整數價格加稅正確", () => {
    expect(withTax(39000)).toBe(40950);
    expect(withTax(89000)).toBe(93450);
    expect(withTax(69000)).toBe(72450);
  });
  it("非整除者四捨五入", () => {
    expect(withTax(2990)).toBe(3140); // 3139.5 → 3140
    expect(withTax(5990)).toBe(6290); // 6289.5 → 6290
    expect(withTax(9900)).toBe(10395);
  });
  it("促銷方案含稅金額", () => {
    expect(withTax(10000)).toBe(10500);
    expect(withTax(2000)).toBe(2100);
  });
});

describe("促銷方案（首波創始客戶計畫）", () => {
  it("兩個 SKU 都存在且標為 promo", () => {
    for (const sku of ["launch-setup", "launch-care"]) {
      const p = getProduct(sku);
      expect(p, `${sku} 應存在`).toBeTruthy();
      expect(p!.group).toBe("promo");
    }
  });

  it("promo 與常規清單互斥（避免定價區並排互打）", () => {
    const promo = new Set(promoProducts().map((p) => p.sku));
    expect(promo.size).toBeGreaterThan(0);
    for (const p of [...oneTimeProducts(), ...monthlyProducts()]) {
      expect(promo.has(p.sku), `${p.sku} 不應同時出現在常規清單`).toBe(false);
    }
  });

  it("每個 promo 方案都有中英皆備的 badge 與 promoNote", () => {
    for (const p of promoProducts()) {
      for (const locale of ["zh-TW", "en"] as const) {
        expect(p.badge?.[locale], `${p.sku} badge.${locale}`).toBeTruthy();
        expect(p.promoNote?.[locale], `${p.sku} promoNote.${locale}`).toBeTruthy();
      }
    }
  });

  it("launch-setup 指向 launch-care，反查也成立", () => {
    expect(getProduct("launch-setup")!.recommendedCareSku).toBe("launch-care");
    expect(plansUsingCare("launch-care").map((p) => p.sku)).toEqual(["launch-setup"]);
  });
});

describe("維護配對（recommendedCareSku）", () => {
  it("除網站健檢外，每個一次性方案都指向存在的月費方案", () => {
    for (const p of oneTimeProducts()) {
      if (p.sku === "site-rescue") {
        expect(p.recommendedCareSku).toBeUndefined();
        continue;
      }
      expect(p.recommendedCareSku, `${p.sku} 應有建議維護`).toBeTruthy();
      const care = getProduct(p.recommendedCareSku!);
      expect(care, `${p.recommendedCareSku} 應存在`).toBeTruthy();
      expect(care!.type).toBe("monthly");
    }
  });

  it("plansUsingCare 反查正確", () => {
    const names = (sku: string) => plansUsingCare(sku).map((p) => p.sku).sort();
    expect(names("care-basic")).toEqual(["web-basic"]);
    expect(names("care-growth")).toEqual(["dashboard", "web-commerce"]);
    expect(names("care-ai")).toEqual(["ai-chatbot", "automation", "automation-bundle"]);
  });
});

describe("目錄完整性", () => {
  it("SKU 不重複", () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
  it("每個方案中英文皆有名稱與價格 > 0", () => {
    for (const p of PRODUCTS) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.i18n["zh-TW"].name.length).toBeGreaterThan(0);
      expect(p.i18n.en.name.length).toBeGreaterThan(0);
    }
  });
  it("月費方案只用於 monthlyProducts", () => {
    expect(monthlyProducts().every((p) => p.type === "monthly")).toBe(true);
  });
});
