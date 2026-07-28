// 文山木材行 — 站點基本資料（客戶確認後可直接修改此檔）
// 上線遷移：客戶網域綁定後，把 INDEXABLE 改為 true，並在 next.config.ts 加 host-based rewrite
//   { source: "/:path*", has: [{ type: "host", value: "客戶網域" }], destination: "/wenshan/:path*" }

export const WS = "/wenshan";

export const SITE = {
  name: "文山木材行",
  tagline: "關渡・北投 木材專門",
  addressFull: "112 台北市北投區立功街79巷5號",
  address: {
    postalCode: "112",
    region: "台北市",
    locality: "北投區",
    street: "立功街79巷5號",
  },
  phoneDisplay: "02 2891 3227",
  phoneTel: "+886228913227",
  phoneIntl: "+886-2-2891-3227",
  geo: { lat: 25.1260476, lng: 121.4690197 },
  mapsUrl:
    "https://www.google.com/maps/place/%E6%96%87%E5%B1%B1%E6%9C%A8%E6%9D%90%E8%A1%8C/@25.1260476,121.4690197,17z/",
  rating: "4.8",
  // 打烊時間為暫定，待客戶確認
  hoursDisplay: "週二至週六 07:00–17:00（週日、週一公休）",
  openingDays: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  opens: "07:00",
  closes: "17:00",
  // LINE 官方帳號開通後填入（例如 "@wenshanwood"），填入後全站 LINE 按鈕自動啟用
  lineId: null as string | null,
} as const;

// 客戶網域綁定前先不進索引，避免與未來正式網域重複內容
export const INDEXABLE = false;
