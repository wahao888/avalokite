// 限時檔期：名額與倒數的唯一設定來源。
//
// 這一檔的數字是行銷檔期參數，不是庫存或訂單狀態——實際成交名額由人工控管，
// 要調整就改這裡再重新部署（或改成從環境變數讀）。
//
// 倒數採「錨點 + 固定週期」推算，不是寫死某個到期日：
// 到期當下會自動滾到下一個週期，檔期因此持續開著、不會出現 00:00:00 的死頁面。

export const PROMO_WINDOW = {
  /** 本檔開放席次 */
  seatsTotal: 10,
  /** 已認購席次（顯示用；小於等於 seatsTotal） */
  seatsTaken: 7,
  /** 倒數週期的起算點（UTC+8 的 2026-09-01 00:00） */
  anchor: Date.UTC(2026, 7, 31, 16, 0, 0),
  /** 每一輪倒數的長度（小時） */
  cycleHours: 72,
} as const;

export const seatsLeft = () =>
  Math.max(0, PROMO_WINDOW.seatsTotal - PROMO_WINDOW.seatsTaken);

/** 目前這一輪的截止時間（毫秒）。now 落在哪一輪就回哪一輪的結尾。 */
export function currentDeadline(now: number = Date.now()): number {
  const period = PROMO_WINDOW.cycleHours * 60 * 60 * 1000;
  const cycles = Math.floor((now - PROMO_WINDOW.anchor) / period) + 1;
  return PROMO_WINDOW.anchor + cycles * period;
}

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

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
