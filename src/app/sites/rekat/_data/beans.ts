// REKAT ROASTERY — 豆單
//
// ┌─ 這份資料的可信度分級（改動前務必先讀）──────────────────────────┐
// │ ① exact：直接抄自客戶提供的豆單——編號、品名、處理方式、烘焙度、    │
// │    風味描述、半磅售價、三包優惠價。這幾欄不得自行「潤飾」。         │
// │ ② context：產區背景（國家、產區、品種、莊園沿革）為公開資料整理，   │
// │    屬於「這個產區是什麼」而非「這一批的批次卡」。前台會標示來源。   │
// │ ③ derived：風味輪家族、風味輪廓分數、插畫母題，是由 ① 的風味描述    │
// │    推導出來的視覺化參數，不是杯測結果。前台明講「非杯測分數」。     │
// │                                                                  │
// │ 王龍提供正式批次卡（海拔、含水率、杯測分數、烘焙日）之後，          │
// │ 把 ② ③ 換成真的，並移除前台的「示意」標註。                        │
// └──────────────────────────────────────────────────────────────────┘
//
// 目前依據：2026 九月豆單（見 _data/site.ts 的 SITE.listVersion）。
// 換豆單時：改這個檔的 BEANS、site.ts 的 listVersion，兩處一起。
//
// 新增一支豆子 = 在 BEANS 陣列加一筆。插畫由 <BeanArt> 依 motif / family
// 自動生成，不必畫圖；風味雷達由 profile 自動繪製。

import { FAMILY, type FamilyKey } from "./flavor-wheel";

/** 處理法。key 同時是 /beans?process= 的篩選值 */
export type ProcessKey =
  | "washed"
  | "special-washed"
  | "natural"
  | "honey"
  | "wet-hulled";

export type ProcessInfo = {
  key: ProcessKey;
  /** 豆單上的寫法，例：日曬(N) */
  labelZh: string;
  labelEn: string;
  /** 一句話講清楚它對風味做了什麼 */
  gist: string;
};

export const PROCESS: Record<ProcessKey, ProcessInfo> = {
  washed: {
    key: "washed",
    labelZh: "水洗",
    labelEn: "Washed",
    gist: "果肉在乾燥前就被洗掉，風味只剩豆子自己——最乾淨、酸質最清晰的一條路。",
  },
  "special-washed": {
    key: "special-washed",
    labelZh: "特殊水洗",
    labelEn: "Special Washed",
    gist: "水洗的架構，但在發酵段動了手腳——控溫、控時、控菌種，把果調推得比一般水洗遠得多。",
  },
  natural: {
    key: "natural",
    labelZh: "日曬",
    labelEn: "Natural",
    gist: "整顆果實連皮帶肉曬乾，糖分與果香一路滲進豆子裡，甜感重、果香濃。",
  },
  honey: {
    key: "honey",
    labelZh: "蜜處理",
    labelEn: "Honey",
    gist: "去皮但留著黏質層曬乾，站在水洗的乾淨與日曬的甜之間。",
  },
  "wet-hulled": {
    key: "wet-hulled",
    labelZh: "濕剝",
    labelEn: "Wet-Hulled / Giling Basah",
    gist: "印尼獨有。含水率還有三成多就先去殼，剩下的路讓豆子裸著走完——換來極厚的 Body 與那股草本、木質的沉。",
  },
};

/**
 * 烘焙度。
 * 主力是淺焙——高單價生豆的產地風味在深焙會被燒掉。
 * 中焙只出現在需要它的豆子上（例如濕剝的曼特寧，淺焙撐不起它的草本厚度）。
 */
export type RoastKey = "light" | "light-medium" | "medium";

export const ROAST: Record<
  RoastKey,
  { labelZh: string; labelEn: string; /** 0–1，用於烘焙度刻度的位置 */ pos: number }
> = {
  light: { labelZh: "淺焙", labelEn: "Light", pos: 0.24 },
  "light-medium": { labelZh: "淺中焙", labelEn: "Light–Medium", pos: 0.4 },
  medium: { labelZh: "中焙", labelEn: "Medium", pos: 0.55 },
};

/** 插畫母題。<BeanArt> 依此畫出杯口上方那一叢圖案 */
export type Motif =
  | "peach"
  | "jasmine"
  | "bergamot"
  | "berry"
  | "grape"
  | "cacao"
  | "nut"
  | "spice"
  | "lily"
  | "citrus"
  | "rum"
  | "sugar"
  | "tea"
  | "plum"
  | "tropical";

/** 風味輪廓。1–5，由風味描述推導，非杯測分數。 */
export type Profile = {
  acidity: number; // 酸質
  sweetness: number; // 甜感
  body: number; // 醇厚度
  aroma: number; // 香氣
  aftertaste: number; // 餘韻
  clean: number; // 乾淨度
};

export const PROFILE_LABEL: Record<keyof Profile, string> = {
  acidity: "酸質",
  sweetness: "甜感",
  body: "醇厚",
  aroma: "香氣",
  aftertaste: "餘韻",
  clean: "乾淨度",
};

export type CountryCode = "US" | "PA" | "JM" | "ET" | "KE" | "CO" | "GT" | "ID" | "PE";

/**
 * 三包優惠。豆單「備註」欄那一格。
 *
 * 為什麼存「整組價」而不是折扣率或折抵金額：豆單上寫的是「三包4800」，
 * 老闆與客人核對的也是這個數字。存成 0.8 折之類的東西，四捨五入之後
 * 就會跟紙本對不起來——而對得起帳是這一欄唯一的職責。
 */
export type Bundle = {
  /** 幾包一組。目前豆單全部是 3 */
  qty: number;
  /** 整組的價格（新台幣） */
  price: number;
  /** 豆單原文的標籤：「三包」或「特三包」 */
  label: string;
};

export type Bean = {
  /** 豆單上的編號，保留下來讓客戶對單方便 */
  no: number;
  slug: string;
  /** 豆單原文品名 */
  nameZh: string;
  nameEn: string;
  /** 產地國 */
  country: string;
  countryCode: CountryCode;
  /** 產區／莊園／處理廠（來自品名，未超譯） */
  region?: string;
  /** 品種。只在品名已載明或該產區只有單一公認品種時填寫，其餘留空而非猜測 */
  variety?: string;
  process: ProcessKey;
  roast: RoastKey;
  /** 豆單原文的風味描述，逐項拆開 */
  notes: string[];
  /** 半磅（227g）售價，新台幣 */
  price: number;
  /** 豆單「備註」欄的三包優惠。沒有就是沒有 */
  bundle?: Bundle;
  /** 品名裡標了「空運」的批次 */
  airFreight?: boolean;
  /** 主要風味家族，第一個為主調（決定卡片配色） */
  families: FamilyKey[];
  motif: Motif;
  profile: Profile;
  /** 卡片上那一句。Avalo 依風味描述撰寫，待王龍確認 */
  excerpt: string;
  /** 單品頁段落。同上，待確認 */
  story: string[];
  /** 產區背景（公開資料整理，非批次卡）。前台會標示資料性質 */
  context?: string;
};

const B = (price: number, label: string): Bundle => ({ qty: 3, price, label });

const BEANS: Bean[] = [
  {
    no: 1,
    slug: "hawaii-kona-extra-fancy",
    nameZh: "極品夏威夷可娜 Extra Fancy 等級",
    nameEn: "Hawaii Kona Extra Fancy",
    country: "美國夏威夷",
    countryCode: "US",
    region: "可娜 Kona",
    variety: "鐵比卡 Typica",
    process: "washed",
    roast: "light",
    notes: ["萊姆", "柑橘", "花香", "水梨"],
    price: 2000,
    families: ["fruity", "floral"],
    motif: "citrus",
    profile: { acidity: 4, sweetness: 4, body: 4, aroma: 4, aftertaste: 4, clean: 5 },
    excerpt: "全世界少數由法律保護產地名稱的咖啡，而 Extra Fancy 是它最上面那一格。",
    story: [
      "可娜長在夏威夷大島的火山西坡上，早上曬太陽、下午起雲、晚上降溫——這套天然的日照節奏讓果實成熟得慢而穩定。產區小、人工貴，價格從來就不便宜。",
      "Extra Fancy 是可娜官方分級的最高等級，看的是豆體大小與瑕疵數。這一支走水洗淺焙，萊姆與柑橘在前，收在水梨那種清脆的甜。",
      "它不是靠強度取勝的豆子。乾淨、輕、細，喝完不會留下負擔——這是可娜一直被拿來當「早晨那一杯」的原因。",
    ],
    context:
      "可娜（Kona）位於夏威夷大島西側的華拉萊與冒納羅亞火山坡地。夏威夷州對「100% Kona」有法定產地規範，並依豆體大小與瑕疵數分級，Extra Fancy 為最高等級。",
  },
  {
    no: 2,
    slug: "esmeralda-green-label",
    nameZh: "空運巴拿馬藝伎 翡翠莊園綠標",
    nameEn: "Hacienda La Esmeralda — Green Label Gesha",
    country: "巴拿馬",
    countryCode: "PA",
    region: "波奎特 Boquete",
    variety: "藝伎 Gesha",
    process: "washed",
    roast: "light",
    notes: ["檸檬卡士達", "佛手柑", "藍莓與水蜜桃"],
    price: 2000,
    bundle: B(4800, "三包"),
    airFreight: true,
    families: ["fruity", "sweet", "floral"],
    motif: "bergamot",
    profile: { acidity: 5, sweetness: 5, body: 3, aroma: 5, aftertaste: 5, clean: 5 },
    excerpt: "藝伎之所以是藝伎，這一支要負一半的責任。",
    story: [
      "2004 年翡翠莊園第一次把藝伎送進 Best of Panama，拿了冠軍，也拍出了當時的世界紀錄價。整個精品咖啡對「花香」的想像，是從那一年被改寫的。",
      "「檸檬卡士達」是這一批最準的一個詞——檸檬的酸掛在一層奶蛋的甜上面，不是尖的。佛手柑撐住中段，藍莓與水蜜桃收尾。",
      "走空運，不是海運。生豆從產地到烘豆室的時間縮短，含水率與風味的衰減都少一截；價格也是為此而來。",
    ],
    context:
      "翡翠莊園（Hacienda La Esmeralda）位於巴拿馬 Boquete，是巴拿馬藝伎的發掘者與推廣者，長年在 Best of Panama 競標會上創下紀錄。莊園依批次分級，綠標為其中一層。",
  },
  {
    no: 3,
    slug: "blue-mountain-clydesdale",
    nameZh: "空運牙買加藍山 No.1 克里斯戴爾莊園",
    nameEn: "Jamaica Blue Mountain No.1 — Clydesdale Estate",
    country: "牙買加",
    countryCode: "JM",
    region: "藍山 Blue Mountain",
    variety: "鐵比卡 Typica",
    process: "washed",
    roast: "light",
    notes: ["核果", "杏仁", "巧克力", "奶油", "花香"],
    price: 1700,
    bundle: B(4500, "三包"),
    airFreight: true,
    families: ["nutty-cocoa", "sweet", "floral"],
    motif: "nut",
    profile: { acidity: 3, sweetness: 4, body: 4, aroma: 4, aftertaste: 4, clean: 5 },
    excerpt: "整份豆單裡唯一不靠香氣取勝的貴豆——它賣的是平衡。",
    story: [
      "藍山不是果香派的。它的價值在於「沒有一個地方突出，也沒有一個地方塌陷」——酸、甜、苦、Body 全部對齊，乾淨到近乎無聊，但很難做到。",
      "核果與杏仁打底，中段是巧克力與奶油那種帶脂感的圓，尾巴才浮出一點花香。傳統上藍山用木桶裝運，本批走空運。",
      "如果你身邊有人「不喝酸咖啡」，這支是唯一不用先解釋的選擇。",
    ],
    context:
      "克里斯戴爾（Clydesdale）為牙買加最早的咖啡莊園之一，創立於 18 世紀末，位於藍山區聖凱瑟琳峰一帶，維持鐵比卡（Typica）種植傳統。牙買加藍山採法定分級，No.1 為豆體最大的等級。",
  },
  {
    no: 4,
    slug: "ninety-plus-double-anaerobic",
    nameZh: "巴拿馬藝伎 —「90+」Ninety Plus 雙重厭氧",
    nameEn: "Panama Ninety Plus Gesha — Double Anaerobic",
    country: "巴拿馬",
    countryCode: "PA",
    region: "Ninety Plus Gesha Estates",
    variety: "藝伎 Gesha",
    process: "honey",
    roast: "light",
    notes: ["蘭姆酒", "佛手柑", "葡萄乾"],
    price: 1200,
    bundle: B(2700, "特三包"),
    families: ["sour-fermented", "fruity", "sweet"],
    motif: "rum",
    profile: { acidity: 4, sweetness: 5, body: 4, aroma: 5, aftertaste: 5, clean: 3 },
    excerpt: "兩段無氧發酵之後，咖啡開始講酒的語言。",
    story: [
      "Ninety Plus 是把「發酵」當成創作手段的那一派。整顆果實先進密閉槽做兩段無氧發酵，再走蜜處理——等於讓風味在缺氧的環境裡多長兩次。",
      "蘭姆酒的酒感先來，葡萄乾接在後面，佛手柑把整杯拉回明亮。這是刻意做出來的複雜度，不是意外。",
      "喝這支請先放涼一點再喝——溫度降下來之後，酒香跟果乾會分得更開。",
    ],
    context:
      "Ninety Plus 由 Joseph Brodsky 創立，2009 年起在巴拿馬 Volcán 一帶造林復育，把藝伎種在原生林那樣的樹蔭底下，2014 年首次量產。旗下批次多次用於世界咖啡沖煮大賽奪冠。",
  },
  {
    no: 5,
    slug: "ethiopia-gesha-kaile",
    nameZh: "衣索比亞藝伎 凱蕾莊園",
    nameEn: "Ethiopia Gesha — Kaile Estate",
    country: "衣索比亞",
    countryCode: "ET",
    variety: "藝伎 Gesha",
    process: "natural",
    roast: "light",
    notes: ["堅果", "檸檬", "茉莉花", "紅茶"],
    price: 700,
    bundle: B(1500, "特三包"),
    families: ["floral", "nutty-cocoa", "fruity"],
    motif: "tea",
    profile: { acidity: 4, sweetness: 4, body: 4, aroma: 5, aftertaste: 4, clean: 4 },
    excerpt: "日曬藝伎少見的一種長相：花香浮在上面，底下是堅果。",
    story: [
      "多數日曬藝伎會往果醬那個方向去，這一支反而收得很穩——茉莉花與紅茶在鼻腔，檸檬把酸拉開，底層卻是堅果的厚。",
      "「紅茶感」在杯測語言裡是很高的評價。它指的是那種帶單寧、乾淨、會在舌面留下收斂感的尾韻，多半只出現在體質夠好的豆子上。",
      "七百塊能喝到藝伎的骨架，這是整份豆單裡最划算的入場券之一。",
    ],
  },
  {
    no: 6,
    slug: "ninety-plus-classic-gesha",
    nameZh: "巴拿馬「90+」經典藝伎",
    nameEn: "Panama Ninety Plus — Classic Gesha",
    country: "巴拿馬",
    countryCode: "PA",
    region: "Ninety Plus Gesha Estates",
    variety: "藝伎 Gesha",
    process: "natural",
    roast: "light",
    notes: ["櫻桃", "藍莓", "黑巧克力", "堅果"],
    price: 1200,
    bundle: B(3000, "三包"),
    families: ["fruity", "nutty-cocoa"],
    motif: "berry",
    profile: { acidity: 4, sweetness: 5, body: 4, aroma: 4, aftertaste: 4, clean: 4 },
    excerpt: "同一個莊園，把發酵拿掉之後的樣子。",
    story: [
      "跟第 4 號是同一個莊園、同一個品種。差別在於這支只走單純日曬，沒有那兩段密閉發酵——所以它是「90+ 沒有加特效」的版本。",
      "櫻桃與藍莓在前段，中後轉進黑巧克力與堅果的厚。果調明確但不炸，甜感很整齊。",
      "想知道厭氧到底改變了什麼，把 4 號跟 6 號放在一起沖，答案會非常清楚。",
    ],
  },
  {
    no: 7,
    slug: "panama-altieri-gesha",
    nameZh: "最佳巴拿馬藝伎 阿爾鐵里莊園",
    nameEn: "Panama Gesha — Altieri Estate",
    country: "巴拿馬",
    countryCode: "PA",
    region: "波奎特 Boquete",
    variety: "藝伎 Gesha",
    process: "natural",
    roast: "light",
    notes: ["梅酒", "黑糖", "蜂蜜", "桃子", "花香"],
    price: 1600,
    bundle: B(4200, "三包"),
    families: ["sweet", "fruity", "floral"],
    motif: "plum",
    profile: { acidity: 4, sweetness: 5, body: 4, aroma: 5, aftertaste: 5, clean: 4 },
    excerpt: "翡翠莊園的種子，種在隔壁那座山上。",
    story: [
      "阿爾鐵里的藝伎種子是直接跟翡翠莊園的 Peterson 家族買的——也就是說，第 2 號跟這一支是血親，只是換了一塊地、換了一種處理法。",
      "日曬讓糖分留在豆子裡：黑糖與蜂蜜打底，桃子撐中段，最上面浮著花香。而「梅酒」那個詞來自日曬發酵留下的果酒感，收得住、不雜。",
      "跟第 2 號一起買，會是這份豆單裡最有意思的一組對照。",
    ],
    context:
      "阿爾鐵里莊園（Altieri Estate）由義裔美國人 Eugene Altieri 於 1973 年移居巴拿馬後創立，位於波奎特，旗下兩座農場依海拔與微氣候分成十一個地塊，種植海拔約 1,350–2,200 公尺。藝伎種源購自翡翠莊園的 Peterson 家族，近年在 Best of Panama 藝伎組多次進榜。",
  },
  {
    no: 8,
    slug: "guatemala-gesha-blueberry",
    nameZh: "瓜地馬拉小藍莓莊園藝伎",
    nameEn: "Guatemala Gesha — Blueberry Estate",
    country: "瓜地馬拉",
    countryCode: "GT",
    variety: "藝伎 Gesha（正統巴拿馬藝伎種子）",
    process: "natural",
    roast: "light",
    notes: ["野薑花", "柑橘", "伯爵茶", "水蜜桃"],
    price: 1200,
    bundle: B(2700, "特三包"),
    families: ["floral", "fruity"],
    motif: "lily",
    profile: { acidity: 4, sweetness: 4, body: 4, aroma: 5, aftertaste: 4, clean: 4 },
    excerpt: "同一批血統，換一個國家種，會長成什麼樣子。",
    story: [
      "用的是正統的巴拿馬藝伎種子，但土地換成瓜地馬拉。同樣的基因、不同的海拔與土壤，杯子裡就是另一件事——這正是產區之所以重要的理由。",
      "野薑花是它最特別的地方，比茉莉更野一點、帶一絲辛香。伯爵佛手柑的調性接在後面，水蜜桃把甜感墊起來。",
      "建議跟第 2 號、第 7 號的巴拿馬藝伎排在一起喝，三支一組就是一堂產區課。",
    ],
  },
  {
    no: 9,
    slug: "yirgacheffe-aricha-adorsi",
    nameZh: "衣索比亞耶加雪菲 G1・Aricha Adorsi 處理廠",
    nameEn: "Ethiopia Yirgacheffe G1 — Aricha Adorsi",
    country: "衣索比亞",
    countryCode: "ET",
    region: "耶加雪菲 Yirgacheffe",
    process: "washed",
    roast: "light",
    notes: ["花香", "柑橘", "檸檬", "紅糖"],
    price: 400,
    families: ["floral", "fruity", "sweet"],
    motif: "citrus",
    profile: { acidity: 5, sweetness: 4, body: 3, aroma: 4, aftertaste: 3, clean: 5 },
    excerpt: "耶加雪菲的教科書版本：花香、柑橘，收在紅糖上。",
    story: [
      "耶加雪菲是很多人認識精品咖啡的第一站，也是最容易被做壞的一支——它太細，烘深一點就沒了。",
      "水洗讓它的酸質清楚、尾巴乾淨。花香在最前面，柑橘與檸檬撐住中段，紅糖在最後把整杯收圓。G1 是衣索比亞的最高等級，指的是每 300 公克的瑕疵數。",
      "四百塊，這是我們最常推薦給「想開始喝手沖」的人的第一支。",
    ],
    context:
      "Aricha 是耶加雪菲一帶知名的處理廠群，以乾淨的水洗批次著稱。衣索比亞的 G1／G2 為法定生豆分級，依每 300 公克的瑕疵豆數判定，G1 為最高。",
  },
  {
    no: 10,
    slug: "ethiopia-lucy-gesha",
    nameZh: "衣索比亞 Lucy 藝伎之母",
    nameEn: "Ethiopia Lucy — Mother of Gesha",
    country: "衣索比亞",
    countryCode: "ET",
    region: "班奇馬吉 Bench Maji・Lucy 處理站",
    variety: "藝伎 Gesha",
    process: "washed",
    roast: "light",
    notes: ["野薑花", "檸檬", "蘋果", "百香果"],
    price: 600,
    bundle: B(1500, "三包"),
    families: ["floral", "fruity"],
    motif: "jasmine",
    profile: { acidity: 5, sweetness: 4, body: 3, aroma: 5, aftertaste: 4, clean: 5 },
    excerpt: "全世界的藝伎都是從這裡走出去的。",
    story: [
      "巴拿馬的藝伎、瓜地馬拉的藝伎、台灣的藝伎，血緣往上追都會回到衣索比亞西南邊的這片森林。Lucy 處理站就在藝伎村隔壁，海拔約 2,280 公尺。",
      "名字取自那具著名的人類化石「露西」——人類起源的象徵，對應這裡是藝伎的起源。",
      "野薑花與檸檬在前，中段轉蘋果的脆甜，百香果收尾。六百塊喝到藝伎的原鄉，這件事本身就值得。",
    ],
    context:
      "Lucy 處理站位於衣索比亞班奇馬吉（Bench Maji）的 Gesha 一帶，緊鄰藝伎村，種植海拔約 2,280 公尺。藝伎品種於 1930 年代在此區被記錄，之後才輾轉傳入中南美洲。",
  },
  {
    no: 11,
    slug: "kenya-dorman-aa-top",
    nameZh: "肯亞 多門 AA TOP",
    nameEn: "Kenya Dorman AA TOP",
    country: "肯亞",
    countryCode: "KE",
    process: "washed",
    roast: "light-medium",
    notes: ["核果", "烏梅", "香草", "可可", "胡桃"],
    price: 400,
    families: ["nutty-cocoa", "fruity", "sweet"],
    motif: "cacao",
    profile: { acidity: 4, sweetness: 4, body: 4, aroma: 3, aftertaste: 4, clean: 4 },
    excerpt: "豆單上唯二不是淺焙的其中一支。多半支的溫度，換來一整個底層。",
    story: [
      "肯亞的水洗豆一向以結構取勝——酸得有力，Body 也撐得住。淺中焙再把堅果與可可的底層拉出來。",
      "核果與胡桃打底，烏梅提供一股深色果實的酸，香草在中段，可可收尾。這是那種早上第一杯、不用想太多的豆子。",
      "AA 是肯亞的豆體分級（篩網 18 目以上），TOP 是同級中更上面的批次。",
    ],
    context:
      "肯亞採法定分級制，AA 指豆體最大的一級。肯亞咖啡多為水洗處理，種植於火山土壤，普遍具有明亮酸質與深色果實的調性。",
  },
  {
    no: 12,
    slug: "sumatra-lintong-blue-eye",
    nameZh: "蘇門達臘林東藍眼曼特林 G1 TP",
    nameEn: "Sumatra Lintong Blue Eye Mandheling G1 TP",
    country: "印尼",
    countryCode: "ID",
    region: "林東 Lintong・多巴湖",
    process: "wet-hulled",
    roast: "medium",
    notes: ["可可榛果", "奶油", "甘草", "草本香料"],
    price: 400,
    families: ["nutty-cocoa", "spices"],
    motif: "spice",
    profile: { acidity: 2, sweetness: 4, body: 5, aroma: 4, aftertaste: 5, clean: 3 },
    excerpt: "整份豆單裡酸度最低、Body 最厚的一支。它走的是完全不同的路。",
    story: [
      "曼特寧不玩花香果酸那一套。濕剝法讓生豆在含水率還有三成多的時候就先去殼，剩下的路裸著走完——這是它厚、沉、帶草本味的來源，也是它辨識度極高的原因。",
      "可可榛果打底，奶油給脂感，甘草與草本香料在尾巴留下那股熟悉的「曼特寧味」。中焙讓這些東西全部就位。",
      "如果你手上有法式濾壓壺，用它沖這一支。金屬濾網留下的油脂會把 Body 再推上一層。",
    ],
    context:
      "林東（Lintong）位於蘇門答臘多巴湖西南側，海拔約 1,200–1,500 公尺，是印尼精品曼特寧的主要產區。濕剝法（Giling Basah）為印尼獨有：豆子在含水率約 30–35% 時即行去殼。G1 為最高生豆等級，TP（Triple Picked）指經過三次人工手選。",
  },
  {
    no: 13,
    slug: "colombia-castillo-paradise",
    nameZh: "哥倫比亞卡斯提優・天堂水果",
    nameEn: "Colombia Castillo — Paradise Fruit",
    country: "哥倫比亞",
    countryCode: "CO",
    variety: "卡斯提優 Castillo",
    process: "special-washed",
    roast: "light",
    notes: ["熱帶水果", "百香果", "鳳梨"],
    price: 600,
    bundle: B(1500, "三包"),
    families: ["fruity", "sour-fermented"],
    motif: "tropical",
    profile: { acidity: 5, sweetness: 5, body: 3, aroma: 5, aftertaste: 4, clean: 4 },
    excerpt: "百香果跟鳳梨。第一次喝的人多半會問是不是加了東西。",
    story: [
      "沒有加任何東西。這些熱帶果調是在發酵段被「養」出來的——控溫、控時間，讓特定的風味前驅物長出來，然後再用水洗把它收乾淨。",
      "百香果的酸很直接，鳳梨接在後面把甜補上，整杯的重心非常高、非常亮。",
      "卡斯提優是哥倫比亞為了抗葉鏽病培育的品種，長年被當成「產量品種」；這幾年的實驗性處理法證明了它在對的手上可以走得多遠。",
    ],
    context:
      "卡斯提優（Castillo）是哥倫比亞國家咖啡研究中心培育的抗葉鏽病品種，在哥倫比亞種植面積極廣。近年多家莊園以控溫控時的實驗性發酵，把這個品種推進精品市場。",
  },
  {
    no: 14,
    slug: "guatemala-flor-del-cafe",
    nameZh: "花神來了 — 瓜地馬拉",
    nameEn: "Flor del Café — Guatemala",
    country: "瓜地馬拉",
    countryCode: "GT",
    region: "安提瓜 Antigua",
    process: "washed",
    roast: "light",
    notes: ["柑橘", "焦糖", "杏仁", "巧克力", "花香"],
    price: 400,
    families: ["sweet", "nutty-cocoa", "fruity"],
    motif: "sugar",
    profile: { acidity: 4, sweetness: 5, body: 4, aroma: 3, aftertaste: 4, clean: 4 },
    excerpt: "中美洲的正統寫法：柑橘開頭，焦糖與杏仁收尾。",
    story: [
      "安提瓜被三座火山圍著，火山灰土壤加上日夜溫差，長出來的豆子甜感厚、Body 穩。花神是這個產區流傳最久的名字之一。",
      "柑橘先亮一下，中段轉焦糖，杏仁與巧克力墊在底下，最後浮出一點花香。結構完整，沒有奇怪的地方。",
      "拿來當每天的基本盤，或是拿來校正自己的手沖，都很合適。",
    ],
    context:
      "安提瓜（Antigua）為瓜地馬拉最知名的產區，位於三座火山之間，火山灰土壤與日夜溫差造就其厚實甜感與均衡結構。",
  },
  {
    no: 15,
    slug: "peru-shb-northern-flower",
    nameZh: "秘魯 SHB・北方之花",
    nameEn: "Peru SHB — Northern Flower",
    country: "秘魯",
    countryCode: "PE",
    process: "washed",
    roast: "light",
    notes: ["榛果", "巧克力", "焦糖", "奶油"],
    price: 400,
    families: ["nutty-cocoa", "sweet"],
    motif: "nut",
    profile: { acidity: 3, sweetness: 4, body: 4, aroma: 3, aftertaste: 4, clean: 4 },
    excerpt: "沒有一個地方在喊。整杯就是順。",
    story: [
      "秘魯咖啡長年被當成拼配用的基底豆，近幾年北部產區的莊園批次才慢慢被單獨看見。它的個性不張揚，但穩定度很高。",
      "榛果與巧克力打底，焦糖給甜，奶油給脂感。沒有尖銳的酸，也沒有奇怪的雜味。",
      "適合早上還沒睡醒、不想被咖啡挑戰的時候。也適合拿來配甜點——它不會跟食物搶。",
    ],
    context:
      "SHB（Strictly Hard Bean）為中南美洲常見的海拔硬度分級，指種植於約 1,200 公尺以上、豆質最緻密的一級。秘魯的精品產區集中在北部的卡哈馬卡與亞馬遜省一帶。",
  },
];

/** 半磅 = 227 公克。豆單上的價格都是這個規格。 */
export const UNIT_GRAMS = 227;
export const UNIT_LABEL = "半磅 / 227g";

// ── 查詢 ───────────────────────────────────────────────────────
// 全部同步、純資料，之後若改為從 CMS 取用只要改這幾支。

export const listBeans = (): Bean[] => [...BEANS].sort((a, b) => a.no - b.no);

export const beanSlugs = (): string[] => BEANS.map((b) => b.slug);

export const getBean = (slug: string): Bean | undefined =>
  BEANS.find((b) => b.slug === slug);

/** 依價格由高到低的前 n 支——首頁「本季重點」用 */
export const topBeans = (n: number): Bean[] =>
  [...BEANS].sort((a, b) => b.price - a.price).slice(0, n);

/** 有三包優惠的豆子，依折抵金額由多到少 */
export const bundledBeans = (): Bean[] =>
  BEANS.filter((b) => b.bundle).sort(
    (a, b) =>
      b.price * b.bundle!.qty - b.bundle!.price - (a.price * a.bundle!.qty - a.bundle!.price),
  );

/** 該豆子的主色（取主風味家族的色票） */
export const beanColor = (b: Bean): string => FAMILY[b.families[0]!].color;
export const beanColorDeep = (b: Bean): string => FAMILY[b.families[0]!].colorDeep;

/** 出現在豆單裡的處理法，依 PROCESS 的宣告順序 */
export function usedProcesses(): ProcessInfo[] {
  const set = new Set(BEANS.map((b) => b.process));
  return (Object.keys(PROCESS) as ProcessKey[])
    .filter((k) => set.has(k))
    .map((k) => PROCESS[k]);
}

/** 出現在豆單裡的產地國，附該國豆子數 */
export function usedCountries(): { code: CountryCode; name: string; count: number }[] {
  const m = new Map<string, { code: CountryCode; name: string; count: number }>();
  for (const b of BEANS) {
    const cur = m.get(b.countryCode);
    if (cur) cur.count += 1;
    else m.set(b.countryCode, { code: b.countryCode, name: b.country, count: 1 });
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}

/** 出現在豆單裡的風味家族，附該家族豆子數 */
export function usedFamilies(): { key: FamilyKey; count: number }[] {
  const m = new Map<FamilyKey, number>();
  for (const b of BEANS) for (const f of b.families) m.set(f, (m.get(f) ?? 0) + 1);
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** 出現在豆單裡的烘焙度，依由淺到深排序 */
export function usedRoasts(): { key: RoastKey; count: number }[] {
  const m = new Map<RoastKey, number>();
  for (const b of BEANS) m.set(b.roast, (m.get(b.roast) ?? 0) + 1);
  return (["light", "light-medium", "medium"] as RoastKey[])
    .filter((k) => m.has(k))
    .map((key) => ({ key, count: m.get(key)! }));
}

export const priceRange = (): [number, number] => {
  const ps = BEANS.map((b) => b.price);
  return [Math.min(...ps), Math.max(...ps)];
};
