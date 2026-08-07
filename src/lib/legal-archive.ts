import type { LegalDoc } from "./legal-content";

/**
 * 已被取代的條款版本全文。
 *
 * 為什麼需要這個檔案：客戶結帳時同意的是「當下」那一版，訂單只存版本號與內容雜湊。
 * 條款一改，程式碼裡就只剩新版——沒有這份封存，就再也還原不出客戶當初同意的文字，
 * 而那正是爭議發生時唯一有用的東西。
 *
 * 【改條款的標準程序】
 *   1. 先把 legal-content.ts 現行的 LEGAL.terms 與 LEGAL.refund 整段複製到下方，
 *      以現行的 LEGAL_VERSION 為 key。
 *   2. 再修改 legal-content.ts 的內容，並把 LEGAL_VERSION 改成今天的日期。
 *   3. 跑 `npx vitest run tests/legal.test.ts`——會驗證封存的雜湊與當初一致。
 *
 * 這個檔案**只增不改**。既有條目的任何一個字都不能動，動了就等於偽造證據。
 */
export const LEGAL_ARCHIVE: Record<
  string,
  Record<"zh-TW" | "en", { terms: LegalDoc; refund: LegalDoc }>
> = {
  // 2026-08-07 為首個納入同意紀錄機制的版本，在它之前的訂單沒有版本紀錄
  //（正式站當時尚無任何訂單，故無須封存更早的版本）。
};

export const archivedVersions = () => Object.keys(LEGAL_ARCHIVE);
