// REKAT ROASTERY — 站點基本資料（客戶確認後可直接修改此檔）
//
// 本站掛在 rekat.avalokite.xyz，由 src/proxy.ts 依 Host 改寫到 /sites/rekat/*，
// 所以站內連結一律用網址列上看得到的外部路徑（/、/beans、/craft…），RK 前綴為空字串。
// 客戶綁自有網域時：於 src/lib/tenants.ts 的該筆 tenant 填 domain，
// 並把下方 INDEXABLE 與 tenants.ts 的 indexable 一起改成 true。

/** 站內連結前綴。子網域掛載下為空字串；保留此常數是為了日後改回子目錄時只需改這裡。 */
export const RK = "";

export const SITE = {
  name: "REKAT ROASTERY",
  nameZh: "日卡地自然農莊",
  nameFull: "REKAT ROASTERY 日卡地自然農莊",

  /** 豆單頁尾王龍自己寫的那一句。這是客戶的原話，不要改。 */
  tagline: "給人幸福就是幸福",
  taglineEn: "To give happiness is happiness.",

  /**
   * 品牌名的由來。來源：阿美族語地名考據與部落報導（公開資料，2026-09-01 查證）。
   * 「日卡地」是台東縣鹿野鄉永安村的阿美族部落，族語 Rekat 意為「水乾」——
   * 部落旁的無名溪遇雨則漲、雨停則乾，因此得名。
   */
  nameOrigin:
    "日卡地是台東縣鹿野鄉永安村的阿美族部落，族語寫作 Rekat，意思是「水乾」——部落旁那條無名溪遇雨就漲，雨一停就乾。",

  roaster: {
    name: "王龍",
    title: "烘豆師",
    /** 客戶提供：三十年烘豆資歷 */
    years: 30,
    /** 公開報導：2012 年夏天進駐日卡地部落，推行無農藥、無肥料的自然農法 */
    settledYear: 2012,
  },

  region: "台東縣鹿野鄉永安村・日卡地部落",
  /** ⚠️ 完整門牌待客戶提供。目前全站只顯示到部落層級，不編造地址。 */
  addressFull: null as string | null,

  /** 豆單頁尾印的電話 */
  phoneDisplay: "0935-156000",
  phoneTel: "+886935156000",

  /** ⚠️ 待客戶提供，填了即全站啟用 */
  email: null as string | null,
  lineId: null as string | null,

  facebook: "https://www.facebook.com/rekatfarm/",
  blog: "http://rekatfarm.blogspot.com/",

  /** 豆單版本。換新豆單時改這裡，前台會顯示「本期豆單」 */
  listVersion: "2026 九月豆單",
} as const;

/**
 * 豆單的免責提醒。換豆單時連同 SITE.listVersion 一起改。
 */
export const LIST_NOTE =
  "本頁品項與售價依 2026 九月豆單；每季批次不同，售完為止，下單前請以來電確認為準。";

/** 三包優惠的通則說明。九支豆子有這個優惠，規則只有一套，寫在這裡供各頁引用。 */
export const BUNDLE_NOTE =
  "標示「三包」「特三包」的品項為同一支豆子三包一組的優惠價；湊不滿一組的餘數以原價計。全品項一律出原豆，不代客研磨。";

// 客戶網域綁定與內容定稿前先不進索引，避免與未來正式網域重複內容。
// 註：robots.txt 由 src/proxy.ts 依 tenants.ts 的 indexable 產生，兩處請一併調整。
export const INDEXABLE = false;
