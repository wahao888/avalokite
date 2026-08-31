import { getFlavorBoard } from "@/lib/tenant-data";
import { flavorBySlug } from "./flavors";

/* ═══════════════════════════════════════════════════════════════
   今日供應板 — 把資料庫那一列，接上程式碼裡的口味目錄。

   店家在 /portal/board 勾選今天出的口味（目錄內的），也可以直接打字
   加入還沒收錄的臨時口味。前者拿得到顏色與插畫，後者只有名字——
   這是刻意的：新口味當天就能貼上牆，插畫與文案之後再補。
   ═══════════════════════════════════════════════════════════════ */

export type BoardEntry = {
  key: string;
  zh: string;
  en?: string;
  /** 目錄內的口味才有；臨時口味為 null */
  slug: string | null;
  color: string;
  colorDeep: string;
};

export type TodayBoard = {
  entries: BoardEntry[];
  note: string | null;
  updatedAt: Date | null;
  /** 給口味列表判斷「今天有沒有這一款」 */
  slugs: Set<string>;
};

/** 臨時口味沒有指定顏色，就依名字取一個穩定的品牌色階 */
const EXTRA_COLORS = [
  ["#FFC732", "#8F5E00"],
  ["#F5A93F", "#C4761A"],
  ["#E9A8B8", "#B25E75"],
  ["#B3CE8A", "#75904C"],
  ["#C79A63", "#8A6134"],
] as const;

function colorFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const pair = EXTRA_COLORS[h % EXTRA_COLORS.length];
  return [pair[0], pair[1]];
}

export async function getTodayBoard(): Promise<TodayBoard> {
  const row = await getFlavorBoard("monsieurlong");

  const fromCatalogue: BoardEntry[] = row.slugs
    .map((slug): BoardEntry | null => {
      const f = flavorBySlug(slug);
      if (!f) return null; // 口味目錄裡被刪掉的 slug，安靜略過
      return {
        key: `f-${f.slug}`,
        zh: f.nameZh,
        en: f.nameEn,
        slug: f.slug,
        color: f.color,
        colorDeep: f.colorDeep,
      };
    })
    .filter((x): x is BoardEntry => x !== null);

  const fromExtras: BoardEntry[] = row.extras.map((name) => {
    const [color, colorDeep] = colorFor(name);
    return { key: `x-${name}`, zh: name, slug: null, color, colorDeep };
  });

  const entries = [...fromCatalogue, ...fromExtras];

  return {
    entries,
    note: row.note,
    updatedAt: row.updatedAt,
    slugs: new Set(fromCatalogue.map((e) => e.slug!)),
  };
}

/** 「今日供應 8 款・13:00 開賣」這種一行字 */
export function boardHeadline(board: TodayBoard): string {
  if (board.entries.length === 0) return "13:00 開賣・售完為止";
  return `今日供應 ${board.entries.length} 款・售完為止`;
}

export const boardUpdatedLabel = (d: Date | null): string | null =>
  d
    ? new Intl.DateTimeFormat("zh-TW", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Taipei",
      }).format(d)
    : null;
