// Monsieur Long — 口味目錄
//
// ┌─ 這裡放什麼、不放什麼 ────────────────────────────────────────┐
// │ 這裡是「口味目錄」：插畫用的色票、風味文案、圖示母題。          │
// │ 幾個月才動一次，屬於設計資產，適合走版控與部署。               │
// │                                                              │
// │ 「今天賣哪幾款」不在這裡——那每天都變，住在資料庫，由店家在      │
// │ /portal/board 自己勾選（見 prisma 的 FlavorBoard）。          │
// └──────────────────────────────────────────────────────────────┘
//
// 新增一個口味 = 在 FLAVORS 陣列加一筆。不用改任何 React 元件，
// 插畫由 <ScoopArt> 依 color / colorDeep / motif 自動生成。
//
// ⚠️ 文案為 Avalo 撰寫的初稿，待店家確認後替換。
// ⚠️ base / vegan / alcohol / allergens 是食品安全資訊，一律留空，
//    等店家逐項確認才填；未填時前台顯示「以店內標示為準」，不會憑空標示。

export type Motif =
  | "salt"
  | "sesame"
  | "cocoa"
  | "citrus"
  | "peanut"
  | "pistachio"
  | "berry"
  | "leaf"
  | "bean"
  | "vanilla"
  | "sun"
  | "lychee"
  | "longan";

export type Allergen = "dairy" | "egg" | "nut" | "peanut" | "gluten" | "soy" | "sesame";

export const ALLERGEN_ZH: Record<Allergen, string> = {
  dairy: "乳製品",
  egg: "蛋",
  nut: "堅果",
  peanut: "花生",
  gluten: "麩質",
  soy: "大豆",
  sesame: "芝麻",
};

export type Flavor = {
  slug: string;
  nameZh: string;
  nameEn: string;
  /** 插畫與全站染色的主色 */
  color: string;
  /** 同色系深一階：插畫的陰影、文字落在色塊上時的對比色 */
  colorDeep: string;
  /** 插畫上的裝飾母題 */
  motif: Motif;
  /** 卡片上那一句 */
  excerpt: string;
  /** 詳頁段落 */
  story: string[];
  /** 風味關鍵字（僅描述風味方向，非成分表） */
  notes: string[];
  kind: "signature" | "seasonal";
  /** 顯示在卡片角落的標籤，例：中秋限定 */
  badge?: string;
  /** ISO 日期。填了就會自動判定 NEW（30 天內）與 LIMITED 倒數 */
  availableFrom?: string;
  availableTo?: string;
  order?: number;

  // ↓ 待店家確認，v1 全部留空
  base?: "milk" | "sorbet";
  vegan?: boolean;
  alcohol?: boolean;
  allergens?: Allergen[];
};

const FLAVORS: Flavor[] = [
  {
    slug: "fleur-de-sel-milk",
    nameZh: "鹽之花牛奶",
    nameEn: "Fleur de Sel Milk",
    color: "#F4E4C6",
    colorDeep: "#C9A96B",
    motif: "salt",
    excerpt: "牛奶的甜，要有一點鹹才說得清楚。",
    story: [
      "最素的那一支，也是最難藏的那一支。沒有果香可以躲，沒有可可可以蓋，只剩牛奶自己。",
      "鹽之花在最後才落下，顆粒還在，咬到的時候甜度會忽然變得立體。",
    ],
    notes: ["牛奶", "鹽之花", "奶香尾韻"],
    kind: "signature",
    order: 1,
  },
  {
    slug: "pepper-sesame",
    nameZh: "椒香芝麻",
    nameEn: "Sichuan Pepper & Sesame",
    color: "#6E6058",
    colorDeep: "#3A322C",
    motif: "sesame",
    excerpt: "黑芝麻的厚，被花椒撬開一個縫。",
    story: [
      "芝麻本來是很沉的味道，一路厚到底。加了花椒之後，尾巴會突然亮起來，像有人把窗戶推開。",
      "中秋期間限定。過了就要等明年。",
    ],
    notes: ["黑芝麻", "花椒", "焙香"],
    kind: "seasonal",
    badge: "中秋限定",
    availableFrom: "2026-08-20",
    availableTo: "2026-10-10",
    order: 2,
  },
  {
    slug: "classic-chocolate",
    nameZh: "經典巧克力",
    nameEn: "Classic Chocolate",
    color: "#4A2E23",
    colorDeep: "#2A1810",
    motif: "cocoa",
    excerpt: "不加花樣，就把可可做到底。",
    story: [
      "巧克力是最容易做得好吃、也最容易做得無聊的一支。差別在於敢不敢讓它苦。",
      "我們讓它苦一點，甜就退到後面去，可可的酸和果香才浮得出來。",
    ],
    notes: ["可可", "微苦", "厚實"],
    kind: "signature",
    order: 3,
  },
  {
    slug: "summer",
    nameZh: "夏日",
    nameEn: "Summer",
    color: "#F5A93F",
    colorDeep: "#C4761A",
    motif: "sun",
    excerpt: "把一整個台北的夏天舀進杯子裡。",
    story: [
      "沒有寫成分，因為它每年都不太一樣——夏天當季有什麼好果子，這一支就是什麼。",
      "熱到不想講話的那種下午，通常就是它賣得最快的時候。",
    ],
    notes: ["當季水果", "酸甜", "清爽"],
    kind: "seasonal",
    order: 4,
  },
  {
    slug: "peanut-youtiao",
    nameZh: "花生油條",
    nameEn: "Peanut & Youtiao",
    color: "#DDA95F",
    colorDeep: "#A9722C",
    motif: "peanut",
    excerpt: "早餐店的記憶，做成了甜點。",
    story: [
      "花生的濃、油條的酥，本來是配豆漿的組合。放進 gelato 裡，酥的部分還在，只是冷了。",
      "大稻埕的老味道，用法式的做法重講一次。",
    ],
    notes: ["花生", "油條酥脆", "焦香"],
    kind: "signature",
    order: 5,
  },
  {
    slug: "pistachio",
    nameZh: "開心果",
    nameEn: "Pistachio",
    color: "#A9BE7B",
    colorDeep: "#6E8244",
    motif: "pistachio",
    excerpt: "綠得很誠實的那一種綠。",
    story: [
      "開心果是義式冰淇淋的照妖鏡。顏色太綠的通常靠色素，真的開心果磨出來是偏灰的橄欖綠。",
      "我們的這一支就是那個顏色。看起來不夠漂亮，吃起來對得起自己。",
    ],
    notes: ["開心果", "堅果油脂", "微鹹"],
    kind: "signature",
    order: 6,
  },
  {
    slug: "murcott-kumquat",
    nameZh: "茂谷柑金桔",
    nameEn: "Murcott & Kumquat",
    color: "#F0A028",
    colorDeep: "#B96A08",
    motif: "citrus",
    excerpt: "兩種柑橘吵架，最後誰也沒贏。",
    story: [
      "茂谷柑甜得直接，金桔酸得帶皮。兩個放在一起會互相修剪，甜的不膩、酸的不刺。",
      "皮的部分沒有丟掉，苦味留一點點在最後面。",
    ],
    notes: ["茂谷柑", "金桔", "柑橘皮"],
    kind: "signature",
    order: 7,
  },
  {
    slug: "strawberry-lemon",
    nameZh: "草莓檸檬",
    nameEn: "Strawberry & Lemon",
    color: "#EE8A8F",
    colorDeep: "#B94B58",
    motif: "berry",
    excerpt: "草莓需要檸檬，才不會甜得太順。",
    story: [
      "草莓單獨做很容易變成糖水味。檸檬進來之後，果酸把輪廓切出來，草莓才有形狀。",
      "顏色是自然的粉紅，不是紅。紅得太漂亮的草莓冰，通常有別的原因。",
    ],
    notes: ["草莓", "檸檬", "果酸"],
    kind: "signature",
    order: 8,
  },
  {
    slug: "lychee",
    nameZh: "荔枝",
    nameEn: "Lychee",
    color: "#E9A8B8",
    colorDeep: "#B25E75",
    motif: "lychee",
    excerpt: "像剛剝好的那一顆，不是荔枝口味。",
    story: [
      "荔枝的香氣很跑，離開果殼沒多久就淡掉了。所以這支只在產季做，而且做多少賣多少。",
      "吃到的時候應該要像有人剛在你旁邊剝了一顆。",
    ],
    notes: ["荔枝", "花香", "多汁"],
    kind: "seasonal",
    order: 9,
  },
  {
    slug: "longan",
    nameZh: "龍眼",
    nameEn: "Longan",
    color: "#C79A63",
    colorDeep: "#8A6134",
    motif: "longan",
    excerpt: "煙燻過的甜，台灣人一聞就認得。",
    story: [
      "龍眼乾是用柴火慢慢烘出來的，甜味裡帶著煙。那個煙味放進奶香裡，會變得很溫柔。",
      "很多人第一口說不出是什麼，第二口才想起來是小時候的味道。",
    ],
    notes: ["龍眼", "煙燻", "蜜香"],
    kind: "seasonal",
    order: 10,
  },
  {
    slug: "guava",
    nameZh: "芭樂",
    nameEn: "Guava",
    color: "#B3CE8A",
    colorDeep: "#75904C",
    motif: "leaf",
    excerpt: "最不像甜點的水果，做成了甜點。",
    story: [
      "芭樂的香是青的，不是甜的。這一支刻意不加太多糖，讓那股青味站在前面。",
      "配一點點鹽會更好吃——這是台灣人才懂的吃法。",
    ],
    notes: ["芭樂", "青果香", "微鹹"],
    kind: "signature",
    order: 11,
  },
  {
    slug: "yuzu-matcha",
    nameZh: "柚子抹茶",
    nameEn: "Yuzu & Matcha",
    color: "#7E9350",
    colorDeep: "#4C5C2C",
    motif: "leaf",
    excerpt: "抹茶的澀，被柚子接住了。",
    story: [
      "抹茶做冰最怕澀味沒地方去。柚子的酸和香氣剛好接得住，兩個味道會在後段合起來。",
      "苦、酸、香，順序很清楚地一個一個來。",
    ],
    notes: ["抹茶", "柚子", "茶澀"],
    kind: "signature",
    order: 12,
  },
  {
    slug: "vanilla-milk",
    nameZh: "香草牛奶",
    nameEn: "Vanilla Milk",
    color: "#F5EBD8",
    colorDeep: "#C8B084",
    motif: "vanilla",
    excerpt: "小朋友的第一名，大人的最後一杯。",
    story: [
      "香草籽看得到，這件事沒得商量。",
      "小朋友點這支的比例最高，而大人常常在吃完別的之後，回頭再挖一口這個收尾。",
    ],
    notes: ["香草莢", "牛奶", "圓潤"],
    kind: "signature",
    order: 13,
  },
  {
    slug: "strawberry-raspberry",
    nameZh: "草莓覆盆子",
    nameEn: "Strawberry & Raspberry",
    color: "#E2617A",
    colorDeep: "#962E4A",
    motif: "berry",
    excerpt: "兩種紅，一種比一種凶。",
    story: [
      "草莓負責香，覆盆子負責酸。覆盆子的酸是有稜角的，會把整支的味道拉得很醒。",
      "吃第一口會皺一下眉，然後就停不下來。",
    ],
    notes: ["草莓", "覆盆子", "強酸"],
    kind: "signature",
    order: 14,
  },
  {
    slug: "belgian-chocolate-54",
    nameZh: "54% 比利時巧克力",
    nameEn: "54% Belgian Chocolate",
    color: "#59372A",
    colorDeep: "#331B12",
    motif: "cocoa",
    excerpt: "數字寫出來，是因為它真的重要。",
    story: [
      "54% 是一個剛好的位置：可可夠多，還留得住奶香；再高就會變成大人專屬。",
      "跟經典巧克力放在一起試，會很明顯知道自己喜歡哪一邊。",
    ],
    notes: ["比利時可可", "奶香", "圓潤微苦"],
    kind: "signature",
    order: 15,
  },
  {
    slug: "coffee",
    nameZh: "咖啡",
    nameEn: "Coffee",
    color: "#8A6248",
    colorDeep: "#4E3423",
    motif: "bean",
    excerpt: "下午三點的那一杯，變冷了也還在。",
    story: [
      "用喝得下去的咖啡做冰，而不是用咖啡粉調味。所以它會苦，也會酸，跟你平常喝的一樣。",
      "跟巧克力疊一球，是店裡最常被點的組合之一。",
    ],
    notes: ["咖啡", "焙火", "苦韻"],
    kind: "signature",
    order: 16,
  },
];

// ─────────────────────────────────────────────────────────────
// 查詢函式。頁面一律呼叫這些，不直接讀 FLAVORS 陣列——
// 將來換成 Headless CMS 時，只要換掉這個檔案內部，頁面一行都不用動。
// ─────────────────────────────────────────────────────────────

const NEW_DAYS = 45;

const byOrder = (a: Flavor, b: Flavor) => (a.order ?? 999) - (b.order ?? 999);

export async function listFlavors(): Promise<Flavor[]> {
  return [...FLAVORS].sort(byOrder);
}

export async function getFlavor(slug: string): Promise<Flavor | null> {
  return FLAVORS.find((f) => f.slug === slug) ?? null;
}

export async function flavorSlugs(): Promise<string[]> {
  return FLAVORS.map((f) => f.slug);
}

/** 同步版：給 <ScoopArt> 之類只需要查色票的地方用 */
export const flavorBySlug = (slug: string): Flavor | undefined =>
  FLAVORS.find((f) => f.slug === slug);

const day = (iso?: string) => (iso ? new Date(`${iso}T00:00:00+08:00`).getTime() : null);

/** availableFrom 起 45 天內視為新品 */
export function isNew(f: Flavor, now = Date.now()): boolean {
  const from = day(f.availableFrom);
  return from !== null && now >= from && now - from <= NEW_DAYS * 86400_000;
}

/** 有結束日期且尚未結束 = 期間限定 */
export function isLimited(f: Flavor, now = Date.now()): boolean {
  const to = day(f.availableTo);
  return to !== null && now <= to + 86400_000;
}

/** 已經過了結束日期 = 這一季收工了，前台不再主打 */
export function isExpired(f: Flavor, now = Date.now()): boolean {
  const to = day(f.availableTo);
  return to !== null && now > to + 86400_000;
}

/** 距離下架剩幾天；非限定或已過期回 null */
export function daysLeft(f: Flavor, now = Date.now()): number | null {
  const to = day(f.availableTo);
  if (to === null || now > to + 86400_000) return null;
  return Math.max(0, Math.ceil((to + 86400_000 - now) / 86400_000));
}

export type FlavorFlags = {
  isNew: boolean;
  isLimited: boolean;
  isExpired: boolean;
  daysLeft: number | null;
};

export function flagsOf(f: Flavor, now = Date.now()): FlavorFlags {
  return {
    isNew: isNew(f, now),
    isLimited: isLimited(f, now),
    isExpired: isExpired(f, now),
    daysLeft: daysLeft(f, now),
  };
}

/** 首頁「這陣子」區塊：新品與限定優先，最多 n 筆 */
export async function listHighlights(n = 3, now = Date.now()): Promise<Flavor[]> {
  const live = FLAVORS.filter((f) => !isExpired(f, now));
  const score = (f: Flavor) =>
    (isLimited(f, now) ? 2 : 0) + (isNew(f, now) ? 2 : 0) + (f.kind === "seasonal" ? 1 : 0);
  return [...live].sort((a, b) => score(b) - score(a) || byOrder(a, b)).slice(0, n);
}

/** 首頁招牌區：非季節限定的常駐款 */
export async function listSignature(n = 8): Promise<Flavor[]> {
  return [...FLAVORS].filter((f) => f.kind === "signature").sort(byOrder).slice(0, n);
}
