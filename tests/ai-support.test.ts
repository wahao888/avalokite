import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

import { verifyLineSignature } from "@/lib/line";
import { buildKnowledge } from "@/lib/ai-knowledge";
import { PRODUCTS, fmt, withTax } from "@/lib/products";
import { COMPANY } from "@/lib/site";

const SECRET = "test-channel-secret";
const sign = (body: string) =>
  crypto.createHmac("sha256", SECRET).update(body).digest("base64");

describe("LINE 簽章驗證", () => {
  beforeEach(() => {
    process.env.LINE_OA_CHANNEL_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.LINE_OA_CHANNEL_SECRET;
  });

  it("接受 LINE 用同一組 secret 簽出來的請求", () => {
    const body = JSON.stringify({ events: [] });
    expect(verifyLineSignature(body, sign(body))).toBe(true);
  });

  it("body 被改動一個位元組就不通過", () => {
    const body = JSON.stringify({ events: [] });
    const signature = sign(body);
    expect(verifyLineSignature(body + " ", signature)).toBe(false);
  });

  it("換一組 secret 簽的不通過", () => {
    const body = JSON.stringify({ events: [] });
    const forged = crypto.createHmac("sha256", "wrong").update(body).digest("base64");
    expect(verifyLineSignature(body, forged)).toBe(false);
  });

  it("沒有簽章標頭就不通過（不能因為沒帶就放行）", () => {
    expect(verifyLineSignature("{}", null)).toBe(false);
  });

  it("長度不同的簽章直接拒絕，不會讓 timingSafeEqual 丟例外", () => {
    expect(() => verifyLineSignature("{}", "short")).not.toThrow();
    expect(verifyLineSignature("{}", "short")).toBe(false);
  });

  it("伺服器沒設定 secret 時一律拒絕", () => {
    delete process.env.LINE_OA_CHANNEL_SECRET;
    const body = JSON.stringify({ events: [] });
    expect(verifyLineSignature(body, sign(body))).toBe(false);
  });
});

describe("知識庫", () => {
  const kb = buildKnowledge();

  it("每個在售方案的名稱與未稅價都在裡面", () => {
    for (const p of PRODUCTS) {
      expect(kb).toContain(p.i18n["zh-TW"].name);
      expect(kb).toContain(`NT$${fmt(p.price)}`);
    }
  });

  it("同時給出含稅價，客服才不會把未稅價講成實付金額", () => {
    const ai = PRODUCTS.find((p) => p.sku === "ai-chatbot")!;
    expect(kb).toContain(`NT$${fmt(withTax(ai.price))}`);
  });

  it("需要搭配維護的方案會標註，避免報價漏掉月費", () => {
    const needsCare = PRODUCTS.filter((p) => p.recommendedCareSku);
    expect(needsCare.length).toBeGreaterThan(0);
    for (const p of needsCare) {
      expect(kb).toContain(`必須搭配維護方案：${p.recommendedCareSku}`);
    }
  });

  it("含營運主體資料，客人問統編時答得出來", () => {
    expect(kb).toContain(COMPANY.legalName);
    expect(kb).toContain(COMPANY.taxId);
  });

  it("明確禁止自行發明價格與給折扣", () => {
    expect(kb).toContain("不要發明");
    expect(kb).toContain("不要給折扣");
  });
});
