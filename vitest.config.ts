import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 綠界測試商店金鑰，供 CheckMacValue 相關測試使用
    env: {
      ECPAY_MERCHANT_ID: "2000132",
      ECPAY_HASH_KEY: "5294y06JbISpM5x9",
      ECPAY_HASH_IV: "v77hoKGq4kWxNNIS",
      ECPAY_ENV: "stage",
    },
  },
});
