// 採購清單。純函式。
//
// 這是 Amber 收單之後最重要的畫面：她手上有 20 件商品散落在十幾張訂單裡，
// 而她要走進店裡買東西。她需要的不是訂單列表，是「總共該買什麼」——
// 依 商品 × 規格 彙總的一張清單，一根拇指由上往下掃過去。
//
// 沒有這個畫面，她就得自己把十幾張訂單加總一次，那正是這個系統該替她做的事。

import type { AllocCandidate } from "./allocate";
import type { LineItemStatus } from "./settle";

export type PurchaseSourceLine = {
  lineId: string;
  orderId: string;
  orderedAt: Date;
  /** open | void。void 是她自己的測試單，不能進採購清單 */
  orderStatus: string;
  /** 訂購人，UI 展開分配明細時要顯示 */
  memberName: string;

  productId: string | null;
  optionId: string | null;
  name: string;
  optionLabel: string | null;
  imageKey: string | null;

  qty: number;
  gotQty: number | null;
  status: LineItemStatus;
};

export type PurchaseGroup = {
  /** 分組鍵，UI 的 key 與送出時的識別 */
  key: string;
  productId: string | null;
  optionId: string | null;
  name: string;
  optionLabel: string | null;
  imageKey: string | null;

  /** 總共要買幾件 */
  needQty: number;
  /** 目前已標記買到幾件（採購清單的輸入框預設值） */
  gotQty: number;
  /** 是否已經全部處理過（沒有 ordered 的行了） */
  settled: boolean;

  lines: PurchaseSourceLine[];
  /** 直接餵給 allocate() */
  candidates: AllocCandidate[];
};

const groupKey = (l: PurchaseSourceLine) =>
  `${l.productId ?? ""}::${l.optionId ?? ""}`;

/**
 * 哪些行要算進採購需求。
 *
 * 排除兩類：
 *   ・void 訂單——她自己下的測試單，混進採購清單會讓她多買
 *   ・cancelled / refunded 的行——客人已經取消，不必去買
 * oos 留著：她可能到別家店補到，清單上要看得見那筆需求還在。
 */
export function countsTowardPurchase(line: PurchaseSourceLine): boolean {
  if (line.orderStatus === "void") return false;
  if (line.status === "cancelled" || line.status === "refunded") return false;
  return true;
}

/**
 * 彙總成採購清單。
 * 組內依下單時間排序，因為那正是 allocate() 的先到先給順序——
 * UI 上看到的順序與實際分配順序一致，她才不會覺得系統在跳號。
 */
export function purchaseList(lines: PurchaseSourceLine[]): PurchaseGroup[] {
  const groups = new Map<string, PurchaseGroup>();

  for (const line of lines) {
    if (!countsTowardPurchase(line)) continue;

    const key = groupKey(line);
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        productId: line.productId,
        optionId: line.optionId,
        name: line.name,
        optionLabel: line.optionLabel,
        imageKey: line.imageKey,
        needQty: 0,
        gotQty: 0,
        settled: true,
        lines: [],
        candidates: [],
      };
      groups.set(key, g);
    }

    const qty = Math.max(0, Math.floor(line.qty));
    g.needQty += qty;
    // 還沒去採購的行，預設「會全部買到」——輸入框預設值等於需求量，
    // 一切順利時她只要按「套用」，一個字都不用打。
    g.gotQty +=
      line.status === "ordered" ? qty : Math.max(0, Math.min(line.gotQty ?? qty, qty));
    if (line.status === "ordered") g.settled = false;

    g.lines.push(line);
    g.candidates.push({
      lineId: line.lineId,
      orderId: line.orderId,
      orderedAt: line.orderedAt,
      qty,
    });
  }

  const out = [...groups.values()];
  for (const g of out) {
    g.lines.sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime());
    g.candidates.sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime());
  }

  // 同一件商品的規格排在一起；未處理的排前面，讓她先看還沒做的。
  out.sort((a, b) => {
    if (a.settled !== b.settled) return a.settled ? 1 : -1;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return (a.optionLabel ?? "") < (b.optionLabel ?? "") ? -1 : 1;
  });

  return out;
}

/** 一整檔的採購摘要，顯示在頁首讓她知道還有多少沒做 */
export function purchaseSummary(groups: PurchaseGroup[]): {
  totalNeed: number;
  totalGot: number;
  shortage: number;
  pendingGroups: number;
} {
  let totalNeed = 0;
  let totalGot = 0;
  let pendingGroups = 0;
  for (const g of groups) {
    totalNeed += g.needQty;
    totalGot += g.gotQty;
    if (!g.settled) pendingGroups += 1;
  }
  return {
    totalNeed,
    totalGot,
    shortage: Math.max(0, totalNeed - totalGot),
    pendingGroups,
  };
}

/** 匯出成純文字，讓她貼給韓國的代買夥伴或印出來 */
export function purchaseListText(groups: PurchaseGroup[]): string {
  const lines: string[] = [];
  let lastName = "";
  for (const g of groups) {
    if (g.name !== lastName) {
      lines.push(g.name);
      lastName = g.name;
    }
    const spec = g.optionLabel ? `  ${g.optionLabel}` : "  （無規格）";
    lines.push(`${spec.padEnd(14, " ")}${g.needQty} 件`);
  }
  return lines.join("\n");
}
