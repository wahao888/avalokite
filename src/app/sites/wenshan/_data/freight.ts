// 運送與運費（公告價，實際依現場為準；數字待客戶確認後可直接修改）

export interface FreightZone {
  id: string;
  /** 顯示名稱 */
  label: string;
  /** 對應的縣市（運費試算器用） */
  regions: string[];
  /** 每趟起價；0 = 免運；null = 專案報價 */
  baseFee: number | null;
}

export const FREIGHT_ZONES: FreightZone[] = [
  {
    id: "free",
    label: "台北市、新北市",
    regions: ["台北市", "新北市"],
    baseFee: 0,
  },
  {
    id: "near",
    label: "基隆市、桃園市",
    regions: ["基隆市", "桃園市"],
    baseFee: 1200,
  },
  {
    id: "mid",
    label: "新竹縣市、宜蘭縣",
    regions: ["新竹市", "新竹縣", "宜蘭縣"],
    baseFee: 2000,
  },
  {
    id: "far",
    label: "苗栗以南、花東地區",
    regions: [
      "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣",
      "台南市", "高雄市", "屏東縣", "花蓮縣", "台東縣",
    ],
    baseFee: null,
  },
];

/** 每趟基本運費內含材積（才） */
export const INCLUDED_CAI = 500;
/** 超過內含材積後，每滿此才數加收 SURCHARGE 元 */
export const SURCHARGE_STEP_CAI = 100;
export const SURCHARGE = 200;

export const FREIGHT_NOTES = [
  `每趟基本運費內含 ${INCLUDED_CAI} 才，超過部分每滿 ${SURCHARGE_STEP_CAI} 才加收 NT$${SURCHARGE}。`,
  "出車時間：週一至週六 07:00 起，依路線順序配送。",
  "大宗、長期配合另有優惠，歡迎來電洽談。",
  "以上為公告價，實際運費依現場狀況與吊掛需求為準。",
];

export function findZone(region: string): FreightZone | null {
  return FREIGHT_ZONES.find((z) => z.regions.includes(region)) ?? null;
}

/** 估算運費：回傳 null 表示專案報價 */
export function estimateFreight(region: string, cai?: number): { zone: FreightZone; fee: number | null } | null {
  const zone = findZone(region);
  if (!zone) return null;
  if (zone.baseFee === null) return { zone, fee: null };
  let fee = zone.baseFee;
  if (fee > 0 && cai && cai > INCLUDED_CAI) {
    fee += Math.ceil((cai - INCLUDED_CAI) / SURCHARGE_STEP_CAI) * SURCHARGE;
  }
  return { zone, fee };
}

export const ALL_REGIONS = FREIGHT_ZONES.flatMap((z) => z.regions);
