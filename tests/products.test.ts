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
  mixedBuildConflict,
  promoCareNeedsBuild,
  prepaidPeriodsFor,
  earlyExitFee,
  earlyExitTierLabels,
  EARLY_EXIT_TIERS,
  BUILD_COMMIT_MONTHS,
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

describe("促銷方案（限時零元啟動）", () => {
  it("兩個 SKU 都存在且標為 promo", () => {
    for (const sku of ["launch-setup", "launch-care"]) {
      const p = getProduct(sku);
      expect(p, `${sku} 應存在`).toBeTruthy();
      expect(p!.group).toBe("promo");
    }
  });

  it("零元啟動的一次性品項只有保留金，金額等於一期月費（＝折抵首期，總額不變）", () => {
    const plan = PROMO_PLANS.find((p) => p.id === "zero-setup")!;
    const onetime = plan.skus.map((s) => getProduct(s)!).filter((p) => p.type === "onetime");
    expect(onetime.map((p) => p.sku)).toEqual(["launch-deposit"]);
    expect(onetime[0].price).toBe(plan.monthly);
    expect(plan.setup).toBe(0); // 建置費仍是 0 元，保留金不是建置費
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

  it("兩個促銷一次性 SKU 都指向 launch-care，反查也成立", () => {
    expect(getProduct("launch-setup")!.recommendedCareSku).toBe("launch-care");
    expect(getProduct("launch-deposit")!.recommendedCareSku).toBe("launch-care");
    expect(plansUsingCare("launch-care").map((p) => p.sku).sort()).toEqual([
      "launch-deposit",
      "launch-setup",
    ]);
  });
});

describe("促銷方案組合（客戶看到的是方案，不是 SKU）", () => {
  it("每個方案的 SKU 都存在且是 promo 群組", () => {
    expect(PROMO_PLANS.length).toBeGreaterThan(0);
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
      const onetime = plan.skus
        .map((s) => getProduct(s)!)
        .filter((p) => p.type === "onetime")
        .reduce((n, p) => n + p.price, 0);
      const monthly = plan.skus
        .map((s) => getProduct(s)!)
        .filter((p) => p.type === "monthly")
        .reduce((n, p) => n + p.price, 0);
      // 結帳當下實際會刷的一次性金額 ＝ 卡片上寫的建置費 ＋ 保留金。
      // 少了保留金這一項，卡片寫「0 元」而結帳跳出 2,100，那是行銷陷阱。
      expect(onetime, `${plan.id} 一次性金額與 SKU 不符`).toBe(plan.setup + plan.deposit);
      expect(monthly, `${plan.id} 月費與 SKU 不符`).toBe(plan.monthly);
    }
  });

  it("每個方案都含一次性品項與月費（前者讓 checkout 走 hasBuild=true 的延後計費路徑）", () => {
    for (const plan of PROMO_PLANS) {
      // hasBuild=true 才會等「標記已上線」再寄授權連結；沒有一次性品項的話
      // 結帳當下就會授權並扣首期，正是這次要消滅的行為。
      expect(plan.skus.some((s) => getProduct(s)!.type === "onetime"), plan.id).toBe(true);
      expect(plan.skus.some((s) => getProduct(s)!.type === "monthly"), plan.id).toBe(true);
    }
  });

  it("launch-setup 已停售，但仍留在目錄供既有訂單解析品名", () => {
    expect(getProduct("launch-setup")).toBeTruthy();
    expect(PROMO_PLANS.some((p) => p.skus.includes("launch-setup"))).toBe(false);
  });

  it("承諾期內合計金額正確", () => {
    const free = PROMO_PLANS.find((p) => p.setup === 0)!;
    expect(promoPlanTotal(free)).toBe(2000 * 24);
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
  it("零元啟動綁 24 個月（要整組 SKU 齊全）", () => {
    const plan = promoPlanForSkus(["launch-deposit", "launch-care"]);
    expect(plan?.id).toBe("zero-setup");
    expect(plan?.termMonths).toBe(24);
  });

  it("只有 launch-care 反查不到方案（單獨結帳不該拿到促銷承諾期）", () => {
    expect(promoPlanForSkus(["launch-care"])).toBeUndefined();
  });

  it("含已停售 launch-setup 的組合仍反查得到現行方案，不會回 undefined", () => {
    // 只在結帳當下用來決定要寫進訂閱的承諾期；既有訂閱的 termMonths 早已入庫，
    // 不會被這裡的結果追溯改寫。
    expect(promoPlanForSkus(["launch-setup", "launch-deposit", "launch-care"])?.id).toBe(
      "zero-setup"
    );
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

describe("促銷與正式建置不得同車（mixedBuildConflict）", () => {
  it("促銷建置＋正式建置 → 衝突（否則正式方案會吃到促銷維護價）", () => {
    expect(mixedBuildConflict(["launch-setup", "web-commerce"])).toBe(true);
    // 沒擋住的話，89,000 的商務網站只需搭 NT$2,000/月而非 NT$5,990/月
    expect(careOptionsFor(["launch-setup", "web-commerce"]).map((p) => p.sku)).toEqual([
      "launch-care",
    ]);
  });

  it("單獨的促銷或正式建置、以及搭配網站健檢，都不算衝突", () => {
    expect(mixedBuildConflict(["launch-setup", "launch-care"])).toBe(false);
    expect(mixedBuildConflict(["web-commerce", "care-growth"])).toBe(false);
    expect(mixedBuildConflict(["launch-setup", "site-rescue"])).toBe(false);
    expect(mixedBuildConflict([])).toBe(false);
  });
});

describe("承諾期（BUILD_COMMIT_MONTHS）", () => {
  it("含建置的訂單綁 12 個月，單購維護不綁", () => {
    expect(BUILD_COMMIT_MONTHS).toBe(12);
    expect(careRequired(["web-basic"])).toBe(true); // → 綁約
    expect(careRequired(["care-basic"])).toBe(false); // 單購維護 → 不綁
    expect(careRequired(["site-rescue"])).toBe(false); // 健檢 → 不綁
  });

  it("促銷方案的承諾期優先於一般建置的 12 個月", () => {
    expect(promoPlanForSkus(["launch-deposit", "launch-care"])?.termMonths).toBe(24);
  });
});

describe("促銷維護不得單獨結帳（promoCareNeedsBuild）", () => {
  it("只有 launch-care 就擋下——否則等於用促銷價買到沒綁約的維護", () => {
    expect(promoCareNeedsBuild(["launch-care"])).toBe(true);
  });

  it("成組購買、以及一般方案都放行", () => {
    expect(promoCareNeedsBuild(["launch-deposit", "launch-care"])).toBe(false);
    expect(promoCareNeedsBuild(["web-basic", "care-basic"])).toBe(false);
    expect(promoCareNeedsBuild(["care-basic"])).toBe(false); // 一般維護本來就能單買
    expect(promoCareNeedsBuild([])).toBe(false);
  });
});

describe("提前終止補償（earlyExitFee）", () => {
  it("依已完成期數落在正確級距", () => {
    expect(earlyExitFee(0)).toBe(30000);
    expect(earlyExitFee(5)).toBe(30000);
    expect(earlyExitFee(6)).toBe(20000);
    expect(earlyExitFee(11)).toBe(20000);
    expect(earlyExitFee(12)).toBe(10000);
    expect(earlyExitFee(17)).toBe(10000);
    expect(earlyExitFee(18)).toBe(5000);
    expect(earlyExitFee(23)).toBe(5000);
  });

  it("滿 24 期起不再補付（承諾期已履行完畢）", () => {
    expect(earlyExitFee(24)).toBe(0);
    expect(earlyExitFee(99)).toBe(0);
  });

  it("負數與小數不會掉出級距", () => {
    expect(earlyExitFee(-3)).toBe(30000);
    expect(earlyExitFee(5.9)).toBe(30000);
  });

  it("補償金額遞減且不超過標準建置費（否則比直接買還貴）", () => {
    const fees = EARLY_EXIT_TIERS.map((t) => t.fee);
    expect(fees).toEqual([...fees].sort((a, b) => b - a));
    expect(Math.max(...fees)).toBeLessThan(getProduct("web-basic")!.price);
  });

  it("級距說明的條目數與級距一致（條款文案與計算同源）", () => {
    for (const zh of [true, false]) {
      expect(earlyExitTierLabels(zh).length).toBe(EARLY_EXIT_TIERS.length);
    }
  });
});

describe("保留金折抵期數（prepaidPeriodsFor）", () => {
  it("零元啟動的保留金＝1 期月費", () => {
    expect(prepaidPeriodsFor(["launch-deposit", "launch-care"])).toBe(1);
  });

  it("承諾期扣掉保留金後只需再扣 23 期，總額仍是月費 × 24", () => {
    const plan = PROMO_PLANS.find((p) => p.id === "zero-setup")!;
    const prepaid = prepaidPeriodsFor(plan.skus);
    const recurring = plan.termMonths - prepaid;
    expect(recurring).toBe(23);
    // 綠界在授權當下就扣第一期；照 24 期授權會變成 25 期，保留金等於沒折抵。
    expect(plan.deposit + recurring * plan.monthly).toBe(promoPlanTotal(plan));
  });

  it("一般方案與空車沒有預付期數", () => {
    expect(prepaidPeriodsFor(["web-basic", "care-basic"])).toBe(0);
    expect(prepaidPeriodsFor([])).toBe(0);
    expect(prepaidPeriodsFor(["launch-care"])).toBe(0); // 反查不到方案
  });
});
