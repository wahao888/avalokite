import { describe, it, expect } from "vitest";
import { cartConflict, orderSkusFor } from "@/lib/products";

describe("一鍵下單連結（/cart?add=sku）", () => {
  it("建置方案連同必搭的維護一起放，點進去就能結帳", () => {
    expect(orderSkusFor("web-basic")).toEqual(["web-basic", "care-basic"]);
  });
  it("零元啟動：保留金連同月費方案", () => {
    expect(orderSkusFor("launch-deposit")).toEqual(["launch-deposit", "launch-care"]);
  });
  it("不認得、停售或依需求報價的 sku 一律忽略（網址可能被改）", () => {
    expect(orderSkusFor("nope")).toEqual([]);
    expect(orderSkusFor("launch-setup")).toEqual([]);
  });

  it("車上已有 AI 客服再點零元啟動：判定為衝突（購物車會換成只剩零元啟動）", () => {
    expect(cartConflict(["ai-chatbot-lite", "launch-deposit", "launch-care"])).toBe(true);
    expect(cartConflict(["launch-deposit", "launch-care"])).toBe(false);
    expect(cartConflict(["web-basic", "care-basic"])).toBe(false);
  });
});
