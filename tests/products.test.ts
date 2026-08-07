import { describe, it, expect } from "vitest";
import {
  PRODUCTS,
  withTax,
  getProduct,
  oneTimeProducts,
  monthlyProducts,
  plansUsingCare,
  promoProducts,
  PROMO_PLANS,
  PROMO_INCLUDES,
  promoPlanTotal,
  careRequired,
  careOptionsFor,
  recommendedCareFor,
  promoPlanForSkus,
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

describe("促銷方案組合（客戶看到的是方案，不是 SKU）", () => {
  it("每個方案的 SKU 都存在且是 promo 群組", () => {
    expect(PROMO_PLANS.length).toBe(2);
    for (const plan of PROMO_PLANS) {
      expect(plan.skus.length).toBeGreaterThan(0);
      for (const sku of plan.skus) {
        const p = getProduct(sku);
        expect(p, `${plan.id} 參照了不存在的 ${sku}`).toBeTruthy();
        expect(p!.group).toBe("promo");
      }
    }
  });

  it("方案標示的價格與實際 SKU 價格一致（避免文案與收費不符）", () => {
    for (const plan of PROMO_PLANS) {
      const setup = plan.skus
        .map((s) => getProduct(s)!)
        .filter((p) => p.type === "onetime")
        .reduce((n, p) => n + p.price, 0);
      const monthly = plan.skus
        .map((s) => getProduct(s)!)
        .filter((p) => p.type === "monthly")
        .reduce((n, p) => n + p.price, 0);
      expect(setup, `${plan.id} 建置費與 SKU 不符`).toBe(plan.setup);
      expect(monthly, `${plan.id} 月費與 SKU 不符`).toBe(plan.monthly);
    }
  });

  it("兩個方案：付建置費的綁約較短，零元建置的綁約較長", () => {
    const paid = PROMO_PLANS.find((p) => p.setup > 0)!;
    const free = PROMO_PLANS.find((p) => p.setup === 0)!;
    expect(paid.termMonths).toBeLessThan(free.termMonths);
    // 零元方案不含一次性 SKU，checkout 的 hasBuild=false 分支才會當月起扣
    expect(free.skus.some((s) => getProduct(s)!.type === "onetime")).toBe(false);
    // 每個方案都要有月費，否則不是訂閱制
    for (const plan of PROMO_PLANS) {
      expect(plan.skus.some((s) => getProduct(s)!.type === "monthly")).toBe(true);
    }
  });

  it("承諾期內合計金額正確，且零元方案總價較高（長約換免建置費）", () => {
    const paid = PROMO_PLANS.find((p) => p.setup > 0)!;
    const free = PROMO_PLANS.find((p) => p.setup === 0)!;
    expect(promoPlanTotal(paid)).toBe(10000 + 2000 * 12);
    expect(promoPlanTotal(free)).toBe(2000 * 24);
    expect(promoPlanTotal(free)).toBeGreaterThan(promoPlanTotal(paid));
  });

  it("只有一個方案標為推薦，且中英文文案齊備", () => {
    expect(PROMO_PLANS.filter((p) => p.featured).length).toBe(1);
    for (const plan of PROMO_PLANS) {
      for (const locale of ["zh-TW", "en"] as const) {
        const i = plan.i18n[locale];
        expect(i.name.length, `${plan.id}.${locale} name`).toBeGreaterThan(0);
        expect(i.tagline.length, `${plan.id}.${locale} tagline`).toBeGreaterThan(0);
        expect(i.terms.length, `${plan.id}.${locale} terms`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("共通交付內容中英文條目數一致", () => {
    expect(PROMO_INCLUDES["zh-TW"].length).toBe(PROMO_INCLUDES.en.length);
    expect(PROMO_INCLUDES["zh-TW"].length).toBeGreaterThanOrEqual(5);
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

  it("目錄文案不再宣稱建置含首月維護", () => {
    for (const p of PRODUCTS) {
      for (const locale of ["zh-TW", "en"] as const) {
        for (const f of p.i18n[locale].features) {
          expect(f, `${p.sku}.${locale}`).not.toMatch(/第一個月維護|首月維護|首月託管|首月維運/);
          expect(f.toLowerCase(), `${p.sku}.${locale}`).not.toMatch(/first month/);
        }
      }
    }
    for (const plan of PROMO_PLANS) {
      for (const locale of ["zh-TW", "en"] as const) {
        for (const term of plan.i18n[locale].terms) {
          expect(term, `${plan.id}.${locale}`).not.toMatch(/含第一個月維護/);
          expect(term.toLowerCase(), `${plan.id}.${locale}`).not.toMatch(/includes the first month/);
        }
      }
    }
  });

  it("plansUsingCare 反查正確", () => {
    const names = (sku: string) => plansUsingCare(sku).map((p) => p.sku).sort();
    expect(names("care-basic")).toEqual(["web-basic"]);
    expect(names("care-growth")).toEqual(["dashboard", "web-commerce"]);
    expect(names("care-ai")).toEqual(["ai-chatbot", "automation", "automation-bundle"]);
  });
});

describe("維護必選（careRequired / careOptionsFor）", () => {
  it("車上有建置方案時必選維護，且列出全部正式月費方案", () => {
    expect(careRequired(["web-basic"])).toBe(true);
    expect(careOptionsFor(["web-basic"]).map((p) => p.sku)).toEqual(
      monthlyProducts().map((p) => p.sku)
    );
  });

  it("網站健檢與單購維護不強制", () => {
    expect(careRequired(["site-rescue"])).toBe(false);
    expect(careOptionsFor(["site-rescue"])).toEqual([]);
    expect(careRequired(["care-basic"])).toBe(false);
    expect(careRequired([])).toBe(false);
  });

  it("促銷建置只能搭配促銷維護，不與正式月費混選", () => {
    const opts = careOptionsFor(["launch-setup"]);
    expect(opts.map((p) => p.sku)).toEqual(["launch-care"]);
    expect(careRequired(["launch-setup"])).toBe(true);
  });

  it("推薦維護以車上最高價的建置方案為準", () => {
    expect(recommendedCareFor(["web-basic"])).toBe("care-basic");
    // web-commerce（89,000）> web-basic（39,000）→ 取 care-growth
    expect(recommendedCareFor(["web-basic", "web-commerce"])).toBe("care-growth");
    expect(recommendedCareFor(["site-rescue"])).toBeUndefined();
  });

  it("必選的維護方案都真實存在且為月費", () => {
    for (const p of oneTimeProducts()) {
      for (const care of careOptionsFor([p.sku])) {
        expect(care.type).toBe("monthly");
      }
    }
  });
});

describe("承諾期反查（promoPlanForSkus）", () => {
  it("付建置費綁 12 個月，零元啟動綁 24 個月", () => {
    expect(promoPlanForSkus(["launch-setup", "launch-care"])?.termMonths).toBe(12);
    expect(promoPlanForSkus(["launch-care"])?.termMonths).toBe(24);
  });

  it("同時符合兩個方案時取條件較嚴格（SKU 較多）的那個", () => {
    const plan = promoPlanForSkus(["launch-setup", "launch-care"]);
    expect(plan?.id).toBe("founding");
    expect(plan?.setup).toBe(10000);
  });

  it("一般方案沒有綁約", () => {
    expect(promoPlanForSkus(["web-basic", "care-basic"])).toBeUndefined();
    expect(promoPlanForSkus(["site-rescue"])).toBeUndefined();
    expect(promoPlanForSkus([])).toBeUndefined();
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
