import { describe, it, expect } from "vitest";
import {
  checkMacValue,
  verifyCheckMac,
  buildAioCheckout,
  buildPeriodCheckout,
  genOrderId,
} from "../src/lib/ecpay";

const baseOpts = {
  merchantTradeNo: "AVLTEST0011",
  totalAmount: 40950,
  itemName: "形象官網 x 1",
  tradeDesc: "Avalo digital services",
  clientBackUrl: "https://avalokite.xyz/order/result?id=AVLTEST001",
  orderResultUrl: "https://avalokite.xyz/api/ecpay/client-return",
  returnUrl: "https://avalokite.xyz/api/ecpay/return",
};

describe("CheckMacValue 驗章", () => {
  it("同一組參數簽出的值可被 verifyCheckMac 驗證通過（round-trip）", () => {
    const params: Record<string, string> = {
      MerchantID: "2000132",
      MerchantTradeNo: "AVLTEST0011",
      TotalAmount: "40950",
      ItemName: "形象官網 x 1",
    };
    params.CheckMacValue = checkMacValue(params);
    expect(verifyCheckMac(params)).toBe(true);
  });

  it("竄改任何欄位後驗章失敗", () => {
    const params: Record<string, string> = {
      MerchantID: "2000132",
      MerchantTradeNo: "AVLTEST0011",
      TotalAmount: "40950",
    };
    params.CheckMacValue = checkMacValue(params);
    params.TotalAmount = "1"; // 竄改金額
    expect(verifyCheckMac(params)).toBe(false);
  });

  it("CheckMacValue 為大寫十六進位 SHA256（64 字元）", () => {
    const v = checkMacValue({ MerchantID: "2000132", A: "1" });
    expect(v).toMatch(/^[0-9A-F]{64}$/);
  });
});

describe("一次性結帳表單 buildAioCheckout", () => {
  const { fields } = buildAioCheckout(baseOpts);
  it("金額與付款方式正確", () => {
    expect(fields.TotalAmount).toBe("40950");
    expect(fields.ChoosePayment).toBe("ALL");
  });
  it("附帶可驗證的 CheckMacValue", () => {
    expect(verifyCheckMac(fields)).toBe(true);
  });
});

describe("定期定額結帳表單 buildPeriodCheckout", () => {
  const { fields } = buildPeriodCheckout({
    ...baseOpts,
    totalAmount: 6290,
    periodReturnUrl: "https://avalokite.xyz/api/ecpay/period-return",
  });
  it("PeriodAmount 必須等於 TotalAmount，且為每月信用卡定期", () => {
    expect(fields.TotalAmount).toBe("6290");
    expect(fields.PeriodAmount).toBe("6290");
    expect(fields.PeriodType).toBe("M");
    expect(fields.ChoosePayment).toBe("Credit");
  });
  it("附帶可驗證的 CheckMacValue", () => {
    expect(verifyCheckMac(fields)).toBe(true);
  });
});

describe("genOrderId", () => {
  it("格式為 AVL 開頭，加尾碼後長度 < 20（符合綠界上限）", () => {
    for (let i = 0; i < 50; i++) {
      const id = genOrderId();
      expect(id).toMatch(/^AVL[0-9A-Z]+$/);
      expect((id + "2").length).toBeLessThan(20);
    }
  });
  it("連續產生不重複", () => {
    const ids = new Set(Array.from({ length: 200 }, () => genOrderId()));
    expect(ids.size).toBe(200);
  });
});
