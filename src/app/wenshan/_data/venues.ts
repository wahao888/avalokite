// 場域快選：依施工場域建議常用木料（對應 catalog.ts 的 item id）

export interface WsVenue {
  id: string;
  name: string;
  blurb: string;
  /** 對應 catalog item id */
  suggestedItemIds: string[];
  /** 對應 catalog category id，型錄頁標示「你的場域常用」 */
  categoryIds: string[];
}

export const VENUES: WsVenue[] = [
  {
    id: "home",
    name: "住家裝修",
    blurb: "天花板、隔間、櫃體、木地板下地——住家最常用的都在這。",
    suggestedItemIds: ["lauan-stud", "lam-stud", "malacca-bb", "lauan-ply", "calcium-silicate", "half-round"],
    categoryIds: ["lumber", "blockboard", "plywood", "board-misc", "moulding"],
  },
  {
    id: "shop",
    name: "店面／餐飲",
    blurb: "趕工期、要有質感——陳列、檯面、造型牆一次備齊。",
    suggestedItemIds: ["lauan-stud", "osb-board", "peg-board", "oak-panel", "table-top", "poly-ply"],
    categoryIds: ["lumber", "osb", "deco-wood", "solid-panel"],
  },
  {
    id: "office",
    name: "辦公室",
    blurb: "隔間、天花、系統櫃下地，低甲醛料安心進場。",
    suggestedItemIds: ["lam-stud", "malacca-bb", "calcium-silicate", "mdf-board", "birch-ply"],
    categoryIds: ["lumber", "blockboard", "board-misc", "mdf"],
  },
  {
    id: "factory",
    name: "工廠／倉儲",
    blurb: "棧板、墊料、隔間、防護封板，粗重活交給實在的料。",
    suggestedItemIds: ["df-stud", "osb-board", "lauan-ply", "cement-board"],
    categoryIds: ["lumber", "osb", "plywood", "board-misc"],
  },
  {
    id: "site",
    name: "工地結構",
    blurb: "模板支撐、假設工程、保護板，量大直接算給你聽。",
    suggestedItemIds: ["df-stud", "lauan-stud", "lauan-ply", "osb-board", "nails"],
    categoryIds: ["lumber", "plywood", "osb", "hardware"],
  },
  {
    id: "outdoor",
    name: "戶外景觀",
    blurb: "露台、圍籬、花架，防腐南方松＋塑木耐候組合。",
    suggestedItemIds: ["syp-24", "syp-14", "syp-44", "wpc-stud", "oil"],
    categoryIds: ["outdoor", "hardware"],
  },
];

export function findVenue(id: string | undefined | null): WsVenue | null {
  if (!id) return null;
  return VENUES.find((v) => v.id === id) ?? null;
}
