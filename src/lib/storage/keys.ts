// 儲存 key 的產生與驗證。純函式，不碰檔案系統，可單測。
//
// key 的形狀：<tenant>/<yyyy>/<mm>/<22 字元亂數>.jpg
//
// 三個刻意的決定：
//   ① 租戶 slug 放最前面——日後搬 S3 時，bucket policy、per-client 的 du、
//      「刪掉某個客戶的全部檔案」都變成一個前綴的事。
//   ② 檔名**純亂數，絕不由使用者輸入推導**。這些檔案由 nginx 無認證直送，
//      不可猜的檔名就是唯一的存取控制。上架後的商品圖本來就是公開的，
//      但「上傳到一半放棄的草稿」不是。
//   ③ 內容決定檔名的雜湊做法在這裡反而不好：同一張圖重傳會共用檔名，
//      刪掉一個商品就會弄壞另一個商品的圖。亂數沒有這個耦合。

import crypto from "crypto";

const RANDOM_BYTES = 16; // → base64url 22 字元
export const KEY_RE = /^[a-z0-9-]+\/\d{4}\/\d{2}\/[A-Za-z0-9_-]{16,}\.jpg$/;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 產生一個新的儲存 key。以台北日期分月，方便人工翻找 */
export function storageKey(tenantSlug: string, now: Date = new Date()): string {
  // 用台北時間分資料夾：Amber 在首爾上架時，UTC 可能還是前一天，
  // 她去翻檔案時想的是台北的月份。
  const tpe = new Date(now.getTime() + 8 * 60 * 60_000);
  const rand = crypto.randomBytes(RANDOM_BYTES).toString("base64url");
  return `${tenantSlug}/${tpe.getUTCFullYear()}/${pad2(tpe.getUTCMonth() + 1)}/${rand}.jpg`;
}

/**
 * 主圖 key → 縮圖 key。
 * 單射（不同主圖不會撞到同一個縮圖），且不會跳出原本的目錄。
 */
export function thumbKey(key: string): string {
  return key.replace(/\.jpg$/, "_t.jpg");
}

export const isThumbKey = (key: string): boolean => /_t\.jpg$/.test(key);

/**
 * key 是否合法。
 *
 * 這是寫檔前的最後一道防線：即使 key 是我們自己產的，只要有一天有人
 * 讓它接受外部輸入，`..` 就能寫到目錄之外。擋在這裡成本是一個正則。
 */
export function isValidKey(key: string): boolean {
  if (!key || key.length > 200) return false;
  if (key.includes("..") || key.startsWith("/") || key.includes("\\")) return false;
  if (key.includes("\0")) return false;
  return KEY_RE.test(key) || KEY_RE.test(key.replace(/_t\.jpg$/, ".jpg"));
}

/** 從 key 取出租戶 slug（清掃與稽核用） */
export const tenantOfKey = (key: string): string | null =>
  isValidKey(key) ? key.split("/")[0] : null;
