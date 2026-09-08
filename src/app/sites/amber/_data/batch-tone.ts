// 檔期的色彩身分。純函式。
//
// 她可能同時開韓國、日本、歐洲三檔。給每一檔一個色，客人在混合的商品格裡
// 一眼就分得出這件屬於哪一趟——**這同時是功能也是設計**。
//
// 選色的兩個限制：
// ① 日雜清爽的調性 → 全部用低彩度的中間調，不要飽和色。
// ② 同一組色要在淺色與深色模式下都可讀 → 底色與框線用 ink 的半透明疊加
//    （alpha 會自動吃到當下的背景），只有 ink 本身是固定值，
//    而中間調在兩種背景上都看得清楚。

export type Tone = {
  key: string;
  name: string;
  /** 主色。文字、啟用中的晶片底色 */
  ink: string;
  /** 極淡的底（ink 的半透明，兩種模式通吃） */
  soft: string;
  /** 框線（ink 的半透明） */
  line: string;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const make = (key: string, name: string, ink: string): Tone => {
  const [r, g, b] = hexToRgb(ink);
  return {
    key,
    name,
    ink,
    soft: `rgba(${r}, ${g}, ${b}, 0.10)`,
    line: `rgba(${r}, ${g}, ${b}, 0.38)`,
  };
};

/** 六個低彩度的中間調。日雜的用色克制，不要飽和 */
export const TONES: Tone[] = [
  make("clay", "陶土", "#B0705A"),
  make("sage", "抹茶", "#6E8C6A"),
  make("indigo", "灰藍", "#5F7A9B"),
  make("rose", "藕粉", "#B07A88"),
  make("mustard", "芥黃", "#B08A45"),
  make("teal", "墨青", "#4E8A87"),
];

export const isToneKey = (v: unknown): v is string =>
  typeof v === "string" && TONES.some((t) => t.key === v);

/**
 * 這一檔用哪個色。
 *
 * 她有指定就用她挑的；沒有就用檔期 id 推導出一個穩定的顏色——
 * 「零設定但每一檔看起來不一樣」比「逼她每次開檔都先選顏色」實際。
 * 推導是決定性的：同一個檔期永遠是同一個色，不會重新整理就換一個。
 */
export function batchTone(batchId: string, chosen?: string | null): Tone {
  if (chosen) {
    const hit = TONES.find((t) => t.key === chosen);
    if (hit) return hit;
  }
  let h = 0;
  for (let i = 0; i < batchId.length; i++) h = (h * 31 + batchId.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
