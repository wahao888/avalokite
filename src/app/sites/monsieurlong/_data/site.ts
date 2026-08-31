// Monsieur Long 隆先生 — 站點基本資料（客戶確認後可直接修改此檔）
//
// 本站掛在 monsieurlong.avalokite.xyz，由 src/proxy.ts 依 Host 改寫到
// /sites/monsieurlong/*，所以站內連結一律用網址列上看得到的外部路徑
// （/、/flavors、/events…），ML 前綴為空字串。
// 客戶綁自有網域時：於 src/lib/tenants.ts 的該筆 tenant 填 domain，
// 並把下方 INDEXABLE 與 tenants.ts 的 indexable 一起改成 true。

/** 站內連結前綴。子網域掛載下為空字串；保留此常數是為了日後改回子目錄時只需改這裡。 */
export const ML = "";

/**
 * 營業時間。0 = 週日 … 6 = 週六，null = 公休。
 * 來源：Google 商家（2026-08-30 查證）。IG 限動另註明「13:00～售完為止」。
 */
export const HOURS: ({ open: string; close: string } | null)[] = [
  { open: "13:00", close: "19:00" }, // 日
  { open: "13:00", close: "19:00" }, // 一
  null, //                              二 公休
  null, //                              三 公休
  { open: "13:00", close: "19:00" }, // 四
  { open: "13:00", close: "19:00" }, // 五
  { open: "13:00", close: "19:00" }, // 六
];

export const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"] as const;

/** JSON-LD 的 openingHoursSpecification 用 */
export const OPEN_DAYS = [
  "Sunday",
  "Monday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const SITE = {
  name: "Monsieur Long 隆先生",
  nameEn: "Monsieur Long",
  nameZh: "隆先生",
  // 店內霓虹燈上的句子。店家確認為正式 slogan 後可維持不動。
  tagline: "YOUR MOOD YOUR SCOOP",
  taglineZh: "今天想吃哪一種心情",
  intro: "大稻埕貴德街上的手工 Gelato。每日現做，口味隨當天的果物與心情換。",
  since: "2025",

  addressFull: "103 台北市大同區貴德街 59 號",
  address: {
    postalCode: "103",
    region: "台北市",
    locality: "大同區",
    street: "貴德街 59 號",
  },
  // 由 Google 商家的 Plus Code 3G45+59（7QQ33G45+59）解出的格心座標
  geo: { lat: 25.055437, lng: 121.508437 },

  // 店家在 Google 商家上未登記電話。拿到後填入即全站啟用電話按鈕。
  phoneDisplay: null as string | null,
  phoneTel: null as string | null,

  hoursNote: "13:00 開賣，售完為止",
  closedNote: "每週二、三公休",

  mapsUrl: "https://maps.app.goo.gl/gSXzETSGP44LqYPA7",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=" +
    encodeURIComponent("台北市大同區貴德街59號 Monsieur Long 隆先生"),

  instagram: "https://www.instagram.com/monsieurlonglong/",
  instagramHandle: "@monsieurlonglong",
  threads: "https://www.threads.com/@monsieurlonglong",

  rating: "4.8",
  ratingCount: "118",

  // 大眾運輸資訊來自地理位置的常識性描述，非店家公告；如有出入請店家更正。
  transit: [
    { line: "捷運", text: "北門站 3 號出口步行約 12 分鐘；大橋頭站 1 號出口步行約 12 分鐘" },
    { line: "公車", text: "南京西路口、民生西路口一帶下車，往淡水河方向步行" },
    { line: "單車", text: "沿大稻埕碼頭自行車道，河濱出入口出來即到" },
    { line: "停車", text: "環河北路一段沿線與大稻埕碼頭周邊停車場" },
  ],
} as const;

// 客戶網域綁定與內容定稿前先不進索引，避免與未來正式網域重複內容。
// 註：robots.txt 由 src/proxy.ts 依 tenants.ts 的 indexable 產生，兩處請一併調整。
export const INDEXABLE = false;
