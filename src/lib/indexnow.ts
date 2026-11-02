// IndexNow 金鑰不是密碼：規格要求放在網站根目錄的 {key}.txt 裡給 Bing／Yandex 讀。
// 改金鑰時：改這裡、改 public/{key}.txt 的檔名與內容，然後部署時會再 ping 一次。
export const INDEXNOW_KEY = "b7e4c91a2f8d4e6ab3c1d0e9f8a7b6c5";
export const INDEXNOW_HOST = "avalokite.xyz";

export function indexNowEndpoint(host = INDEXNOW_HOST, key = INDEXNOW_KEY) {
  return `https://api.indexnow.org/indexnow?url=https://${host}/sitemap.xml&key=${key}`;
}
