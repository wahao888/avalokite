// 文山木材行 — 木料型錄（初版由 Avalo 依台灣木材行常備品項整理，待客戶依實際庫存增修）
// 規格以行內慣用單位標示：分（厚度，1分≈3mm）、寸、尺（1尺=30.3cm）、4×8尺=標準大板

export type WsStock = "常備現貨" | "依現貨" | "可調貨";

export interface WsItem {
  id: string;
  name: string;
  specs: string[];
  unit: "支" | "片" | "才" | "式" | "支/組";
  stock: WsStock;
  note?: string;
}

export interface WsCategory {
  id: string;
  name: string;
  /** 一句行內話，體現選料專業 */
  blurb: string;
  items: WsItem[];
}

export const CATALOG: WsCategory[] = [
  {
    id: "lumber",
    name: "結構角材",
    blurb: "天花板、隔間下地的主力。直不直、乾不乾很重要，我們幫你挑。",
    items: [
      {
        id: "lauan-stud",
        name: "柳安角材",
        specs: ["1.2寸×1寸×8尺", "1.8寸×1.2寸×8尺"],
        unit: "支",
        stock: "常備現貨",
        note: "裝潢天花、隔間下地最常用",
      },
      {
        id: "spruce-stud",
        name: "雲杉／紐松角材",
        specs: ["1.6寸×1.6寸×8尺", "2寸×1寸×8尺"],
        unit: "支",
        stock: "常備現貨",
        note: "質輕好施工，木結小",
      },
      {
        id: "lam-stud",
        name: "集成三合一角材",
        specs: ["1.2寸×1寸×8尺", "1.4寸×1.4寸×8尺"],
        unit: "支",
        stock: "常備現貨",
        note: "防潮防蟲處理，直度佳不易翹",
      },
      {
        id: "df-stud",
        name: "花旗松／鐵杉角材",
        specs: ["2寸×4寸×8尺–12尺"],
        unit: "支",
        stock: "依現貨",
        note: "結構、模板支撐用",
      },
      {
        id: "wpc-stud",
        name: "塑木角材（戶外）",
        specs: ["依現貨規格"],
        unit: "支",
        stock: "可調貨",
        note: "不腐不蛀，戶外底架用",
      },
    ],
  },
  {
    id: "plywood",
    name: "夾板／合板",
    blurb: "封板、櫃體、模板都靠它。厚度分數講清楚，到貨不出錯。",
    items: [
      {
        id: "lauan-ply",
        name: "柳安夾板",
        specs: ["4×8尺", "厚度 1分／2分／4分／6分"],
        unit: "片",
        stock: "常備現貨",
      },
      {
        id: "birch-ply",
        name: "樺木夾板（F1 低甲醛）",
        specs: ["4×8尺", "9mm／12mm／18mm"],
        unit: "片",
        stock: "依現貨",
        note: "面材漂亮，可直接見光",
      },
      {
        id: "small-ply",
        name: "小尺寸合板",
        specs: ["3×6尺", "3×7尺"],
        unit: "片",
        stock: "常備現貨",
        note: "小空間好搬運",
      },
      {
        id: "poly-ply",
        name: "波麗板／優力膠板",
        specs: ["4×8尺", "常見色現貨"],
        unit: "片",
        stock: "常備現貨",
        note: "櫃內免油漆，一次到位",
      },
    ],
  },
  {
    id: "blockboard",
    name: "木心板",
    blurb: "做櫃體的老朋友。芯材紮實、吃釘力好，才扛得住五金。",
    items: [
      {
        id: "malacca-bb",
        name: "麻六甲芯木心板",
        specs: ["4×8尺 6分（約18mm）", "F1 低甲醛"],
        unit: "片",
        stock: "常備現貨",
        note: "質輕，系統櫃、木作櫃通用",
      },
      {
        id: "lauan-bb",
        name: "柳安芯木心板",
        specs: ["4×8尺 6分（約18mm）"],
        unit: "片",
        stock: "依現貨",
        note: "芯材較重、吃釘力更好",
      },
      {
        id: "poly-bb",
        name: "波麗木心板",
        specs: ["4×8尺 6分", "單面／雙面波麗"],
        unit: "片",
        stock: "常備現貨",
      },
    ],
  },
  {
    id: "osb",
    name: "OSB 歐松板",
    blurb: "結構封板、工業風牆面都行，紋理本身就是表情。",
    items: [
      {
        id: "osb-board",
        name: "OSB 定向粒片板",
        specs: ["4×8尺", "9mm／11mm／15mm／18mm"],
        unit: "片",
        stock: "常備現貨",
      },
    ],
  },
  {
    id: "mdf",
    name: "MDF 密迪板",
    blurb: "面平好加工，雕刻、噴漆、CNC 都聽話。",
    items: [
      {
        id: "mdf-board",
        name: "密迪板",
        specs: ["4×8尺", "2.4mm–18mm 各厚度"],
        unit: "片",
        stock: "常備現貨",
      },
    ],
  },
  {
    id: "solid-panel",
    name: "實木拼板／集成板",
    blurb: "層板、桌板、檯面用。直拼看紋路、指接求安定，看用途幫你配。",
    items: [
      {
        id: "pine-panel",
        name: "松木拼板",
        specs: ["直拼／指接", "12mm／18mm／30mm"],
        unit: "片",
        stock: "常備現貨",
      },
      {
        id: "spruce-panel",
        name: "雲杉直拼板",
        specs: ["12mm／18mm／30mm"],
        unit: "片",
        stock: "依現貨",
      },
      {
        id: "oak-panel",
        name: "紅橡／白橡拼板",
        specs: ["18mm／30mm"],
        unit: "片",
        stock: "依現貨",
        note: "硬木，桌板、檯面首選",
      },
      {
        id: "walnut-panel",
        name: "胡桃木拼板",
        specs: ["30mm"],
        unit: "片",
        stock: "可調貨",
      },
      {
        id: "hinoki-panel",
        name: "檜木板料",
        specs: ["依現貨"],
        unit: "才",
        stock: "依現貨",
        note: "香氣足，數量請先來電確認",
      },
    ],
  },
  {
    id: "deco-wood",
    name: "裝修實木板料",
    blurb: "牆面天花要有木頭味，這一區慢慢挑。",
    items: [
      {
        id: "tg-board",
        name: "企口板",
        specs: ["牆面／天花用", "長度 6尺–8尺"],
        unit: "片",
        stock: "常備現貨",
      },
      {
        id: "peg-board",
        name: "洞洞板",
        specs: ["18mm", "松木／夾板"],
        unit: "片",
        stock: "依現貨",
        note: "店面陳列、工作室收納",
      },
      {
        id: "stair-tread",
        name: "階梯板",
        specs: ["依樓梯尺寸備料"],
        unit: "片",
        stock: "可調貨",
      },
      {
        id: "table-top",
        name: "實木桌板",
        specs: ["可指定尺寸裁製"],
        unit: "片",
        stock: "依現貨",
      },
    ],
  },
  {
    id: "outdoor",
    name: "南方松戶外材（防腐）",
    blurb: "平台、圍籬、花架，日曬雨淋就交給防腐南方松。",
    items: [
      {
        id: "syp-14",
        name: "南方松 1×4／1×6",
        specs: ["長度 8尺–16尺"],
        unit: "支",
        stock: "常備現貨",
        note: "地板面材、圍籬板",
      },
      {
        id: "syp-24",
        name: "南方松 2×4／2×6",
        specs: ["長度 8尺–16尺"],
        unit: "支",
        stock: "常備現貨",
        note: "平台結構、橫樑",
      },
      {
        id: "syp-44",
        name: "南方松 4×4 柱",
        specs: ["長度 8尺–12尺"],
        unit: "支",
        stock: "依現貨",
        note: "立柱、花架主結構",
      },
    ],
  },
  {
    id: "moulding",
    name: "線板／飾條／圓棒",
    blurb: "收邊收得漂亮，整個工才算完。",
    items: [
      {
        id: "half-round",
        name: "半圓線／平線",
        specs: ["長度 6尺–8尺", "各寬度"],
        unit: "支",
        stock: "常備現貨",
      },
      {
        id: "solid-strip",
        name: "實木壓條",
        specs: ["長度 6尺–8尺"],
        unit: "支",
        stock: "常備現貨",
      },
      {
        id: "dowel",
        name: "木圓棒",
        specs: ["各直徑", "長度 3尺–6尺"],
        unit: "支",
        stock: "依現貨",
      },
    ],
  },
  {
    id: "board-misc",
    name: "裝修配套板材",
    blurb: "天花隔間常備配套，一趟車一次備齊，不用多跑建材行。",
    items: [
      {
        id: "calcium-silicate",
        name: "矽酸鈣板",
        specs: ["3×6尺", "6mm"],
        unit: "片",
        stock: "常備現貨",
        note: "天花、隔間封板",
      },
      {
        id: "cement-board",
        name: "水泥板",
        specs: ["3×6尺", "各厚度"],
        unit: "片",
        stock: "依現貨",
      },
      {
        id: "melamine",
        name: "美耐板",
        specs: ["4×8尺", "花色依現貨"],
        unit: "片",
        stock: "可調貨",
      },
    ],
  },
  {
    id: "hardware",
    name: "耗材五金",
    blurb: "白膠、排釘這些小東西，忘了帶最耽誤工，跟料一起載走。",
    items: [
      {
        id: "glue",
        name: "白膠／強力膠／矽利康",
        specs: ["各容量"],
        unit: "式",
        stock: "常備現貨",
      },
      {
        id: "nails",
        name: "釘槍排釘／螺絲",
        specs: ["常用規格"],
        unit: "式",
        stock: "常備現貨",
      },
      {
        id: "oil",
        name: "護木油／木蠟油",
        specs: ["室內／戶外用"],
        unit: "式",
        stock: "依現貨",
      },
    ],
  },
  {
    id: "service",
    name: "裁切與加工",
    blurb: "有圖給圖、沒圖用講的。裁好、刨好、標好，到工地直接用。",
    items: [
      {
        id: "cutting",
        name: "代客裁切",
        specs: ["依裁刀數計"],
        unit: "式",
        stock: "常備現貨",
        note: "板料、角材皆可",
      },
      {
        id: "planing",
        name: "刨光／導角／鑽孔",
        specs: ["依加工內容報價"],
        unit: "式",
        stock: "常備現貨",
      },
      {
        id: "takeoff",
        name: "依圖備料估料",
        specs: ["提供圖面或尺寸即可"],
        unit: "式",
        stock: "常備現貨",
        note: "黃老闆親自看圖給建議",
      },
    ],
  },
];

export function findItem(id: string): { cat: WsCategory; item: WsItem } | null {
  for (const cat of CATALOG) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return { cat, item };
  }
  return null;
}
