// 會員身分。純函式。
//
// ⚠ normalizePhone 是整個系統的「歸戶鍵」——它決定「9/15、9/16、9/18 這三筆
// 是不是同一個人」。這裡錯一個字元的後果是二選一：
//   ・太寬鬆 → 把兩個人合併成一個，A 的地址寄了 B 的貨
//   ・太嚴格 → 把一個人切成兩個，運費收兩次、結單分成兩張
// 所以它必須是純函式、決定性，而且有窮舉輸入的測試。

const FULLWIDTH_ZERO = 0xff10; // ０
const FULLWIDTH_NINE = 0xff19; // ９

/** 全形數字 → 半形 */
function toHalfWidthDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    out +=
      code >= FULLWIDTH_ZERO && code <= FULLWIDTH_NINE
        ? String.fromCharCode(code - FULLWIDTH_ZERO + 0x30)
        : ch;
  }
  return out;
}

/**
 * 把各種寫法的台灣號碼正規化成純數字的本地格式。
 *
 *   0912-345-678   → 0912345678
 *   +886 912345678 → 0912345678
 *   886912345678   → 0912345678
 *   ０９１２３４５６７８ → 0912345678
 *   (02) 1234-5678 → 0212345678
 *
 * 認不出來就回 null——寧可請客人重打，也不要把一個看不懂的字串當成歸戶鍵。
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = toHalfWidthDigits(String(raw)).replace(/\D/g, "");
  if (!digits) return null;

  // 國碼 886 → 本地的 0。台灣的本地號碼一律以 0 開頭，
  // 所以「886 開頭且第四位不是 0」必定是帶國碼的寫法。
  if (digits.startsWith("886") && !digits.startsWith("8860")) {
    digits = "0" + digits.slice(3);
  }

  // 本地號碼一定以 0 開頭。少了那個 0（有人會漏打）就補回去。
  if (!digits.startsWith("0")) digits = "0" + digits;

  // 手機 10 碼、市話 9–10 碼。超出這個範圍的當成打錯。
  if (digits.length < 9 || digits.length > 11) return null;

  return digits;
}

/** 是否為手機號碼（09 開頭 10 碼）。代購幾乎都用手機，市話只當備援 */
export const isMobile = (normalized: string): boolean =>
  /^09\d{8}$/.test(normalized);

/**
 * 顯示用的遮罩：0912345678 → 0912-***-678
 *
 * 用在 /s/<token> 這種「憑不可猜連結就能看」的頁面上。那個連結可能被
 * 轉貼到群組，個資不該跟著一起流出去。
 */
export function maskPhone(normalized: string | null | undefined): string {
  if (!normalized) return "";
  if (normalized.length < 7) return "***";
  const head = normalized.slice(0, 4);
  const tail = normalized.slice(-3);
  return `${head}-***-${tail}`;
}

/** 顯示用的遮罩：王小明 → 王＊明 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  const chars = [...name.trim()];
  if (chars.length <= 1) return chars.join("");
  if (chars.length === 2) return `${chars[0]}＊`;
  return `${chars[0]}${"＊".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 顯示用的遮罩：台北市大安區信義路三段 1 號 → 台北市大安區… */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return "";
  const chars = [...address.trim()];
  return chars.length <= 6 ? address : `${chars.slice(0, 6).join("")}…`;
}
