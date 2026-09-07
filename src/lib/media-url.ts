// 商品照的對外網址。**不匯入任何 node 模組**——購物車抽屜、購物車頁這些
// 客戶端元件也要組這個網址，而 storage/local-disk.ts 會拉進 fs、
// keys.ts 會拉進 crypto，兩者都不能進瀏覽器的 bundle。
//
// （2026-09-07：一開始把 url() 放在 Storage 介面上，結果客戶端元件一 import
// 就把整個 fs 拉進去，build 直接失敗。網址只是字串拼接，本來就不該跟
// 檔案系統綁在一起。）

/**
 * 圖片網址的前綴。
 *
 * 正式站是 nginx 的 `location ^~ /u/`，本機由 src/app/u/[...key] 這支
 * 開發專用路由頂著。搬到 S3／CloudFront 時把這個環境變數指向 CDN 網域即可。
 *
 * ⚠ NEXT_PUBLIC_ 的值會在 build 當下被烤進 bundle。改了之後要重新 build，
 * 而且伺服器那份 .env 才是準的（deploy.sh 會在 build 前把它抓回來）。
 */
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || "/u").replace(/\/$/, "");

/**
 * 主圖 key → 縮圖 key。單射，且留在同一個目錄。
 * 純字串操作，所以前後端共用同一份——兩邊各寫一次遲早會分岔。
 */
export const thumbKey = (key: string): string => key.replace(/\.jpg$/, "_t.jpg");

export const isThumbKey = (key: string): boolean => /_t\.jpg$/.test(key);

export const mediaUrl = (key: string): string => `${MEDIA_BASE}/${key}`;

/** 縮圖網址。列表、購物車、結單畫面用的都是這個尺寸 */
export const thumbUrl = (key: string): string => mediaUrl(thumbKey(key));
