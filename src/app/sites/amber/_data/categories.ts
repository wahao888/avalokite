// 商品分類。刻意留在程式碼而不是資料庫。
//
// 判準是「變動頻率」：商品每天在變（所以進 DB），分類是九筆固定清單、
// 要排序、之後還要配圖示，幾乎不會動——那是設計資產不是營運資料。
// 同樣的切法 FlavorBoard 已經用過（慢的留程式碼、快的進 DB）。
//
// 寫入商品時比對本清單；讀取時認不得的 key 就當「未分類」，
// 髒資料不該讓整個列表 500。

export type Category = {
  key: string;
  name: string;
  /** true = 這類商品通常沒有收單截止（隨時可買） */
  alwaysOpen?: boolean;
};

export const CATEGORIES: Category[] = [
  { key: "korea", name: "韓國連線" },
  { key: "japan", name: "日本連線" },
  { key: "women", name: "女裝" },
  { key: "men", name: "男裝" },
  { key: "shoes", name: "鞋款" },
  { key: "accessory", name: "配件" },
  { key: "beauty", name: "美妝" },
  { key: "food", name: "食品" },
  // 現貨在手上，不必等連線回來，所以預設不設收單時間。
  { key: "instock", name: "現貨", alwaysOpen: true },
];

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

export const getCategory = (key: string | null | undefined): Category | null =>
  key ? BY_KEY.get(key) ?? null : null;

export const isCategoryKey = (v: unknown): v is string =>
  typeof v === "string" && BY_KEY.has(v);

/** 前台顯示用；認不得的 key 不會爆，退成「未分類」 */
export const categoryName = (key: string | null | undefined): string =>
  getCategory(key)?.name ?? "未分類";
