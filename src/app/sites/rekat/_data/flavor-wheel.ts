// SCA 咖啡風味輪（Coffee Taster's Flavor Wheel）— 資料層
//
// 依 2016 年 SCA × World Coffee Research 版本的九大家族與第二層描述詞整理。
// 風味輪的正確讀法是「由內而外」：先落在一個大家族，再往外收斂到具體的詞。
// 網站上的 <FlavorWheel> 就是照這個結構畫的，點內圈會展開外圈。
//
// 色票不是 SCA 官方色，是本站自己配的一套——原版的螢光色系放在和紙底色上
// 會炸掉。這裡把每個家族壓進同一個彩度區間，讓九個家族並置時仍是一張圖。

export type FamilyKey =
  | "fruity"
  | "floral"
  | "sweet"
  | "nutty-cocoa"
  | "spices"
  | "roasted"
  | "green-vegetative"
  | "sour-fermented"
  | "other";

export type Family = {
  key: FamilyKey;
  zh: string;
  en: string;
  /**
   * 畫在輪子上的短標。
   *
   * 輪子的內圈只有 48px 的徑向空間，「酸香／發酵」這種五個字的標會撐出色帶、
   * 疊到外圈上。輪子上放短標、右側說明面板放全名——資訊沒有少，只是換個地方講。
   * 沒填就用 zh。
   */
  short?: string;
  color: string;
  colorDeep: string;
  /** 這個家族在杯子裡通常代表什麼 */
  gist: string;
  /** 第二層描述詞（外圈）。short 同上，外圈只有 32px 可用。 */
  children: { zh: string; en: string; short?: string }[];
};

/** 輪子上要畫的字：有短標就用短標 */
export const wheelLabel = (x: { zh: string; short?: string }): string => x.short ?? x.zh;

export const FAMILY_ORDER: FamilyKey[] = [
  "fruity",
  "sour-fermented",
  "green-vegetative",
  "other",
  "roasted",
  "spices",
  "nutty-cocoa",
  "sweet",
  "floral",
];

export const FAMILY: Record<FamilyKey, Family> = {
  fruity: {
    key: "fruity",
    zh: "果香",
    en: "Fruity",
    color: "#C0574C",
    colorDeep: "#8A3229",
    gist: "咖啡最直接的甜與酸來源。莓果、果乾、柑橘、核果類水果都在這一支底下。",
    children: [
      { zh: "莓果", en: "Berry" },
      { zh: "果乾", en: "Dried Fruit" },
      { zh: "其他水果", en: "Other Fruit" },
      { zh: "柑橘", en: "Citrus Fruit" },
    ],
  },
  "sour-fermented": {
    key: "sour-fermented",
    zh: "酸香／發酵",
    en: "Sour / Fermented",
    short: "發酵",
    color: "#8E5E8C",
    colorDeep: "#5C3A5A",
    gist: "發酵處理法留下的痕跡。控制得好是酒香與優格般的柔酸，過頭就是雜味。",
    children: [
      { zh: "酸質", en: "Sour" },
      { zh: "酒精／發酵", en: "Alcohol / Fermented", short: "酒香" },
    ],
  },
  "green-vegetative": {
    key: "green-vegetative",
    zh: "青草／蔬菜",
    en: "Green / Vegetative",
    short: "青草",
    color: "#6E8B5A",
    colorDeep: "#425636",
    gist: "生青味。多半來自未熟豆或烘焙發展不足，屬於要被避開的一群。",
    children: [
      { zh: "橄欖油", en: "Olive Oil" },
      { zh: "生青", en: "Raw" },
      { zh: "青草", en: "Green / Vegetative" },
      { zh: "豆味", en: "Beany" },
    ],
  },
  other: {
    key: "other",
    zh: "其他",
    en: "Other",
    color: "#8A8578",
    colorDeep: "#5A5449",
    gist: "紙味、霉味、化學味這一類的缺陷風味。杯測時出現就要回頭查倉儲或處理。",
    children: [
      { zh: "紙味／霉味", en: "Papery / Musty", short: "霉味" },
      { zh: "化學味", en: "Chemical" },
    ],
  },
  roasted: {
    key: "roasted",
    zh: "焙烤",
    en: "Roasted",
    color: "#5B4636",
    colorDeep: "#332619",
    gist: "由烘焙產生、而非產地帶來的風味。焙度愈深，這一支的比重就愈大。",
    children: [
      { zh: "菸草", en: "Pipe Tobacco" },
      { zh: "焦味", en: "Burnt" },
      { zh: "穀物", en: "Cereal" },
    ],
  },
  spices: {
    key: "spices",
    zh: "香料",
    en: "Spices",
    color: "#9A5A3C",
    colorDeep: "#6A3620",
    gist: "溫暖香料與辛香刺激。厭氧發酵批次最常出現的一群，也是最容易記住的一群。",
    children: [
      { zh: "刺激感", en: "Pungent" },
      { zh: "胡椒", en: "Pepper" },
      { zh: "溫暖香料", en: "Brown Spice" },
    ],
  },
  "nutty-cocoa": {
    key: "nutty-cocoa",
    zh: "堅果／可可",
    en: "Nutty / Cocoa",
    short: "堅果可可",
    color: "#7A5236",
    colorDeep: "#4C301C",
    gist: "杯子的底層。它不搶戲，但決定了一支豆子喝起來有沒有厚度。",
    children: [
      { zh: "堅果", en: "Nutty" },
      { zh: "可可", en: "Cocoa" },
    ],
  },
  sweet: {
    key: "sweet",
    zh: "甜香",
    en: "Sweet",
    color: "#C9A227",
    colorDeep: "#8E6E10",
    gist: "黑糖、香草、蜂蜜這種「甜的氣味」。高品質生豆最誠實的指標之一。",
    children: [
      { zh: "黑糖", en: "Brown Sugar" },
      { zh: "香草", en: "Vanilla" },
      { zh: "整體甜感", en: "Overall Sweet" },
      { zh: "甜香", en: "Sweet Aromatics" },
    ],
  },
  floral: {
    key: "floral",
    zh: "花香",
    en: "Floral",
    color: "#B58AAE",
    colorDeep: "#7A5573",
    gist: "藝伎讓整個產業重新認識的一支。茉莉、橙花、紅茶感都落在這裡。",
    children: [
      { zh: "紅茶", en: "Black Tea" },
      { zh: "花香", en: "Floral" },
    ],
  },
};

export const listFamilies = (): Family[] => FAMILY_ORDER.map((k) => FAMILY[k]);
