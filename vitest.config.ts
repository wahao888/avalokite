import { defineConfig } from "vitest/config";

export default defineConfig({
  // next-intl 的 proxy 進入點 import "next/server"，這條路徑只在 Next 自己的
  // bundler 條件下解析得到。加上這兩個條件，tests/proxy.test.ts 才能載入 src/proxy.ts。
  resolve: {
    conditions: ["node", "import", "react-server"],
  },
  test: {
    environment: "node",
    server: { deps: { inline: ["next-intl"] } },
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
