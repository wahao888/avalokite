import crypto from "crypto";

/**
 * 客戶站訂單編號：<前綴> + yymmdd + 4 碼亂數。例：RK260901-K7QX
 *
 * 為什麼不用自增 ID：訂單編號會被印在包裹上、唸在電話裡。自增數字會洩漏
 * 「這家店總共接過幾張單」，而且客人一看就知道別人的編號長什麼樣。
 * 為什麼不用 UUID：客人要在電話裡把它唸給老闆聽。
 *
 * 字母表刻意拿掉 0/O/1/I/L/U——手寫與口述最常認錯的那幾個。
 */
const ALPHABET = "23456789ACDEFGHJKMNPQRSTVWXYZ";

export function makeOrderId(prefix: string, now: Date = new Date()): string {
  // 以台北時區的日曆日為準：老闆對帳看的是「今天的單」，不是 UTC 的今天。
  const tpe = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const ymd = tpe.replace(/-/g, "");

  const bytes = crypto.randomBytes(4);
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHABET[bytes[i]! % ALPHABET.length];

  return `${prefix}${ymd}-${tail}`;
}

/** 查詢時用。允許客人輸入小寫或漏打連字號。 */
export function normalizeOrderId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
