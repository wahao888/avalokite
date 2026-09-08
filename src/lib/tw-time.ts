// 台北時間的換算工具。純函式，前後台與測試共用。
//
// 為什麼需要這個檔：後台的收單時間用 <input type="datetime-local">，
// 它給的是「2026-09-20T23:00」這種**沒有時區的牆上時間**。用 new Date(value)
// 解析會採用**執行環境的**時區——而 Amber 上架的時候人在首爾，手機是 KST，
// 她心裡想的「台北 9/20 23:00」會被存成台北的 22:00。
// 她每一件在國外上架的商品都會無聲地差一小時。
//
// 所以：瀏覽器永遠不建構那個 Date，一律把年月日時分拆成數字送到伺服器，
// 由本檔換算成絕對瞬間。
//
// 台灣自 1979 年起不再實施日光節約時間，永遠 UTC+8。硬寫 +08:00 比拉一整份
// tz database 進 bundle 精確也便宜（Intl 也能做，但它只負責格式化，
// 反向的「牆上時間 → 瞬間」還是得自己算）。

export const TAIPEI_OFFSET_MIN = 8 * 60;
export const TAIPEI_TZ = "Asia/Taipei";

export type TaipeiParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
};

/** 台北的牆上時間 → 絕對瞬間 */
export function taipeiWallClockToInstant(p: TaipeiParts): Date {
  return new Date(
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) -
      TAIPEI_OFFSET_MIN * 60_000,
  );
}

/** 絕對瞬間 → 台北的牆上時間 */
export function instantToTaipeiParts(d: Date): TaipeiParts {
  const shifted = new Date(d.getTime() + TAIPEI_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 解析 <input type="datetime-local"> 的值（"2026-09-20T23:00"）為台北瞬間。
 * 格式不合或數值不合理一律回 null——這是使用者輸入，不能信。
 */
export function parseTaipeiLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m) return null;
  const p: TaipeiParts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
  if (p.month < 1 || p.month > 12 || p.day < 1 || p.day > 31) return null;
  if (p.hour > 23 || p.minute > 59) return null;

  const d = taipeiWallClockToInstant(p);
  // 回頭驗一次：2 月 31 日會被 Date.UTC 捲到 3 月，那不是使用者的意思。
  const back = instantToTaipeiParts(d);
  if (back.year !== p.year || back.month !== p.month || back.day !== p.day) return null;
  return d;
}

/** 絕對瞬間 → <input type="datetime-local"> 的預填值（台北時間） */
export function toTaipeiLocalInput(d: Date): string {
  const p = instantToTaipeiParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * 顯示用格式：2026/09/20 23:00
 *
 * 刻意自己組字串而不用 Intl.DateTimeFormat：這個字串會出現在伺服器渲染的
 * HTML 裡，兩邊必須逐字相同才不會 hydration mismatch。Intl 的輸出會隨
 * Node 與瀏覽器的 ICU 版本而有細微差異（分隔符、前導零）。
 */
export function formatTaipei(d: Date, opts: { withTime?: boolean } = {}): string {
  const { withTime = true } = opts;
  const p = instantToTaipeiParts(d);
  const date = `${p.year}/${pad(p.month)}/${pad(p.day)}`;
  return withTime ? `${date} ${pad(p.hour)}:${pad(p.minute)}` : date;
}

/** 台北的今天是幾號（YYYY-MM-DD），用於「預計到貨日」這種只有日期的欄位 */
export function taipeiDateKey(d: Date = new Date()): string {
  const p = instantToTaipeiParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}
