// 文山木材行 — 站點基本資料（客戶確認後可直接修改此檔）
//
// 本站掛在 wenshan.avalokite.xyz，由 src/proxy.ts 依 Host 改寫到 /sites/wenshan/*，
// 所以站內連結一律用網址列上看得到的外部路徑（/、/products、/quote），WS 前綴為空字串。
// 客戶綁自有網域時：於 src/lib/tenants.ts 的該筆 tenant 填 domain，並把下方 INDEXABLE 改 true。

/** 站內連結前綴。子網域掛載下為空字串；保留此常數是為了日後改回子目錄時只需改這裡。 */
export const WS = "";

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
  hoursDisplay: "週一至週六 07:00–17:00（週日公休）",
  openingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  opens: "07:00",
  closes: "17:00",
  // LINE 官方帳號開通後填入（例如 "@wenshanwood"），填入後全站 LINE 按鈕自動啟用
  lineId: null as string | null,
} as const;

// 客戶網域綁定前先不進索引，避免與未來正式網域重複內容
// 註：robots.txt 由 src/proxy.ts 依 tenants.ts 的 indexable 產生，兩處請一併調整
export const INDEXABLE = false;
