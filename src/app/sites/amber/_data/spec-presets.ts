// 規格的快捷鍵與交叉產生器。
//
// 這個檔存在的唯一理由是「30 秒上架」。Amber 站在店裡單手打字，
// 每省一次鍵盤輸入都是真的秒數。

/** 軸名快捷鍵 */
export const AXIS_PRESETS = ["顏色", "尺寸", "款式", "口味", "角色"] as const;

/** 值的快捷鍵：點一下把整組帶進輸入框 */
export const VALUE_PRESETS: { label: string; values: string[] }[] = [
  { label: "S M L XL", values: ["S", "M", "L", "XL"] },
  { label: "均碼", values: ["均碼"] },
  { label: "黑白灰", values: ["黑", "白", "灰"] },
  { label: "常用色", values: ["黑", "白", "米", "灰", "藍", "粉"] },
  { label: "鞋碼", values: ["225", "230", "235", "240", "245", "250"] },
];

export const MAX_OPTIONS = 40;

/**
 * 解析使用者打的規格字串：逗號、頓號、換行、斜線都當分隔。
 * 去空白、去重（保留先出現的順序）、夾在 MAX_OPTIONS 以內。
 */
export function parseOptions(raw: string): string[] {
  const parts = raw
    .split(/[,、\n\r/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

/**
 * 兩軸交叉產生器：["黑","白"] × ["S","M","L"] → ["黑-S","黑-M",…]
 *
 * 這是「單軸資料模型」如何涵蓋「顏色 × 尺寸」的答案。前端展開成扁平清單，
 * DB 仍然只有一軸——兩次點擊拿到兩軸的效果，而不必為了矩陣多一整層資料模型
 * 與一個在手機上填不完的九宮格。
 *
 * 任一邊為空就回傳另一邊（她只填了一軸的情形）。
 */
export function crossOptions(a: string[], b: string[], sep = "-"): string[] {
  if (a.length === 0) return b.slice(0, MAX_OPTIONS);
  if (b.length === 0) return a.slice(0, MAX_OPTIONS);

  const out: string[] = [];
  for (const x of a) {
    for (const y of b) {
      out.push(`${x}${sep}${y}`);
      if (out.length >= MAX_OPTIONS) return out;
    }
  }
  return out;
}
