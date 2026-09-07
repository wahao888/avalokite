// 缺貨分配。純函式。
//
// 場景：採購清單顯示「冰絲襪 黑/M 需要 7」，Amber 到現場只買到 5 件。
// 系統必須決定**是誰缺貨**——這是真實的分配問題，不能丟給她心算，
// 也不能隨機（客人會問，而她要答得出來）。
//
// 規則：**先到先給**，依訂單建立時間排序。理由是它同時滿足三件事：
//   ① 可解釋——「先下單的先出」是代購圈通用的說法，客人聽得懂
//   ② 決定性——同樣的輸入永遠得到同樣的結果，重跑不會換人缺貨
//   ③ 可覆寫——Amber 想照顧老客人時，UI 讓她逐人調整
//
// 排序相同時用 lineId 破平手。這一步不能省：同一秒建立的兩張單若順序隨機，
// 她按兩次「套用」會看到不同的結果，那會讓她不敢相信這個畫面。

export type AllocCandidate = {
  lineId: string;
  orderId: string;
  /** 訂單建立時間（不是行的建立時間——同一張單的每一行都該視為同時下的） */
  orderedAt: Date;
  /** 客人訂了幾件 */
  qty: number;
};

export type Allocation = {
  lineId: string;
  /** 實際分到幾件 */
  gotQty: number;
  /** 分到 0 件才是 oos；分到一部分仍算 bought，由 gotQty 表達短少 */
  status: "bought" | "oos";
};

/** 排序：先到先給，同時間用 lineId 破平手（決定性） */
export function sortCandidates(candidates: AllocCandidate[]): AllocCandidate[] {
  return [...candidates].sort((a, b) => {
    const t = a.orderedAt.getTime() - b.orderedAt.getTime();
    if (t !== 0) return t;
    return a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0;
  });
}

/** 這一組總共需要幾件 */
export const totalNeeded = (candidates: AllocCandidate[]): number =>
  candidates.reduce((s, c) => s + Math.max(0, c.qty), 0);

/**
 * 把買到的 gotTotal 件分給候選人。
 *
 * gotTotal 超過需求時不會超發（多買的自己留著）；小於 0 當 0。
 * 回傳的順序就是分配順序，UI 直接照這個順序顯示「誰拿到、誰沒拿到」。
 */
export function allocate(
  candidates: AllocCandidate[],
  gotTotal: number,
): Allocation[] {
  const sorted = sortCandidates(candidates);
  const need = totalNeeded(sorted);

  let remaining = Math.max(
    0,
    Math.min(Math.floor(Number.isFinite(gotTotal) ? gotTotal : 0), need),
  );

  return sorted.map((c) => {
    const want = Math.max(0, Math.floor(c.qty));
    const give = Math.min(want, remaining);
    remaining -= give;
    return {
      lineId: c.lineId,
      gotQty: give,
      status: give === 0 ? "oos" : "bought",
    };
  });
}

/**
 * 人看得懂的分配摘要，給 UI 與「為什麼是我缺貨」的說明用。
 * 例：「王小明 ×3 全給／李小華 ×2 缺 2」
 */
export function explainAllocation(
  candidates: AllocCandidate[],
  allocations: Allocation[],
  nameOf: (orderId: string) => string,
): string[] {
  const byId = new Map(candidates.map((c) => [c.lineId, c]));
  return allocations.map((a) => {
    const c = byId.get(a.lineId);
    const who = c ? nameOf(c.orderId) : "";
    const want = c?.qty ?? 0;
    if (a.gotQty >= want) return `${who} ×${want} 全給`;
    if (a.gotQty === 0) return `${who} ×${want} 全缺`;
    return `${who} ×${want} 只給 ${a.gotQty}、缺 ${want - a.gotQty}`;
  });
}
