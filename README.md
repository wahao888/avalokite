# Avalo 阿瓦羅 — 官方網站

網站設計開發・企業 AI 自動化工作室官網。莫蘭迪木質×綠色系設計，
透明不二價＋線上下單（綠界 ECPay 一次性＋信用卡定期定額月費訂閱）。

## 技術

Next.js 16（App Router）· TypeScript · next-intl（zh-TW / en）· Prisma + SQLite · 綠界 ECPay · Nodemailer

## 開發

```bash
cp .env.example .env        # 預設已填綠界官方測試商店
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:3000
```

綠界測試卡：`4311-9522-2222-2222`，效期任意未過期，CVV `222`，3D 驗證碼任填。

## 主要路徑

| 路徑 | 說明 |
|---|---|
| `/`、`/en` | 首頁（服務、定價、案例、聯絡） |
| `/cart` → `/checkout` | 購物車與免會員結帳 |
| `/order/result`、`/order/lookup` | 付款結果、訂單查詢（編號＋Email） |
| `/legal/{terms,privacy,refund}` | 服務條款／隱私權／退款政策（綠界審核必備） |
| `/admin` | 營運後台（訂單、訂閱、詢問單；密碼見 `.env`） |

## 商品與文案

- 服務與價格唯一來源：`src/lib/products.ts`
- 介面文案：`src/messages/{zh-TW,en}.json`
- 聯絡資訊（Email / LINE）：`src/lib/site.ts`
- Logo 三變體：`public/brand/`

## 部署

見 [deploy/DEPLOY.md](deploy/DEPLOY.md)（EC2 一鍵硬化腳本、Nginx、HTTPS、綠界正式切換、S3 備份）。
