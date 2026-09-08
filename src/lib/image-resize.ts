// 圖片縮放的參數與算術。純函式，前端壓縮與伺服器端重新編碼共用同一組常數。
//
// 為什麼要共用：前端把長邊壓到 TARGET_EDGE 之後，伺服器再用同一個值重新編碼。
// 兩邊各寫一個數字的話，某天有人只改了其中一邊，就會出現「前端壓到 1600、
// 伺服器又放大回 2000」這種既慢又糊的組合。

/** 主圖長邊。手機商品頁 DPR 3 約 1200 裝置像素，1600 留了捏放的餘裕 */
export const TARGET_EDGE = 1600;

/** 縮圖長邊。列表、結單畫面與通知文字只用得到這個尺寸 */
export const THUMB_EDGE = 400;

/** 主圖 JPEG 品質 */
export const QUALITY = 0.82;

/** 縮圖 JPEG 品質。它只會被顯示在 200px 寬的格子裡，壓狠一點沒人看得出來 */
export const THUMB_QUALITY = 0.7;

/**
 * 前端壓完之後仍超過這個大小就降品質重壓。
 * 全景照與高細節的圖在 q0.82 下可能還是很大。
 */
export const MAX_BYTES = 1_500_000;

/** 降品質的順序，最多三輪 */
export const QUALITY_STEPS = [QUALITY, 0.7, 0.6] as const;

/**
 * 伺服器端的硬上限（nginx 是 2m，這是縱深防禦）。
 * 前端正常壓完約 150–350KB，會走到這個數字一定是有人繞過前端直接打 API。
 */
export const SERVER_MAX_BYTES = 3 * 1024 * 1024;

export type Size = { width: number; height: number };

/**
 * 等比縮到長邊不超過 maxEdge。本來就比較小的圖不放大——
 * 放大只會讓檔案變大、畫質不變。
 */
export function fitWithin(size: Size, maxEdge: number): Size {
  const { width, height } = size;
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };

  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };

  const scale = maxEdge / longest;
  return {
    // 至少 1px：極端長條的圖（例如 4000×1 的截圖）短邊會被算成 0，
    // 那會讓 canvas 與 sharp 都拋錯。
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** JPEG 的 magic bytes。絕不信任 Content-Type，那是使用者送的 */
export const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;

export function looksLikeJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
