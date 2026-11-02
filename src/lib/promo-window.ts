// 限時檔期：名額與倒數的唯一設定來源。
//
// 這一檔的數字是行銷檔期參數，不是庫存或訂單狀態——實際成交名額由人工控管，
// 要調整就改這裡再重新部署（或改成從環境變數讀）。
//
// 倒數有兩種模式：
//   1. `endsAt` 有填 → 固定檔期，倒數會真的走到 0。宣傳素材（短影音、貼文）
//      一旦寫死了截止日就必須用這個模式，否則網站與素材對不上，稀缺性當場破功。
//   2. `endsAt` 為 null → 開放式檔期，改用「錨點 + 固定週期」推算，到期自動滾下一輪，
//      頁面因此不會出現 00:00:00 的死倒數。
// 固定檔期過期後頁面不會顯示過期的優惠（見 isExpired 的使用處），
// 要續檔就把 endsAt 往後移，要回到開放式就改成 null。

export const PROMO_WINDOW = {
  /** 本檔開放席次 */
  seatsTotal: 5,
  /** 已認購席次（顯示用；小於等於 seatsTotal） */
  seatsTaken: 2,
  /** 檔期截止時間；null 表示開放式檔期，改用下面的滾動週期 */
  endsAt: Date.UTC(2026, 10, 30, 16, 0, 0) as number | null, // UTC+8 的 2026-12-01 00:00（11/30 結束）
  /** 滾動模式的倒數起算點（UTC+8 的 2026-09-01 00:00） */
  anchor: Date.UTC(2026, 7, 31, 16, 0, 0),
  /** 滾動模式每一輪倒數的長度（小時） */
  cycleHours: 72,
} as const;

export const seatsLeft = () =>
  Math.max(0, PROMO_WINDOW.seatsTotal - PROMO_WINDOW.seatsTaken);

/** 滾動模式的下一個截止點：now 落在哪一輪就回哪一輪的結尾。 */
export function rollingDeadline(
  now: number,
  anchor: number = PROMO_WINDOW.anchor,
  cycleHours: number = PROMO_WINDOW.cycleHours,
): number {
  const period = cycleHours * 60 * 60 * 1000;
  const cycles = Math.floor((now - anchor) / period) + 1;
  return anchor + cycles * period;
}

/** 目前這一輪的截止時間（毫秒）。固定檔期回 endsAt，開放式檔期回滾動截止點。 */
export function currentDeadline(now: number = Date.now()): number {
  return PROMO_WINDOW.endsAt ?? rollingDeadline(now);
}

/** 固定檔期是否已經結束。開放式檔期永遠回 false。 */
export function isExpired(now: number = Date.now()): boolean {
  return PROMO_WINDOW.endsAt !== null && now >= PROMO_WINDOW.endsAt;
}

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** 補零到兩位，倒數的分秒不跳位才不會抖動 */
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 橫幅用的緊湊寫法：`2d 09:31:07`／`09:31:07`（不足一天就不顯示天） */
export const compactClock = (r: Remaining, dayUnit: string) =>
  `${r.days > 0 ? `${r.days}${dayUnit} ` : ""}${pad2(r.hours)}:${pad2(r.minutes)}:${pad2(r.seconds)}`;

export function remainingFrom(now: number = Date.now()): Remaining {
  const ms = Math.max(0, currentDeadline(now) - now);
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
