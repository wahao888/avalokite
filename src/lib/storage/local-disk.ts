// 本機磁碟的儲存實作。
//
// ⚠ 這是整個 repo 裡唯一知道 /var/www/avalo-uploads 這個路徑的檔案。
// 有一條結構性測試守住這件事——搬 S3 時只要新增 s3.ts 並改 index.ts 的選擇邏輯。
//
// ⚠⚠ 上傳目錄**必須在 repo 樹之外**。
// deploy/deploy.sh 與 server-update.sh 都用 `rsync --delete`，任何寫進
// repo 樹的執行期檔案都會在下一次部署時被刪光。2026-07-30 就是這樣把
// prod.db 整個刪掉過一次；商品照片沒有 .db 那樣的每日備份，掉了就真的沒了。

// Turbopack 會對本檔發出兩個 "Dynamic filesystem access causes tracing of the
// whole project" 警告。那是預期的——儲存介面本來就是用執行期算出來的路徑讀寫檔案。
// 它影響的是 standalone output 的相依追蹤，而本專案的部署是 rsync 整包 + next start，
// 沒有用 standalone，所以沒有實際影響。看到警告不必修。

import fs from "fs/promises";
import path from "path";
import type { Storage } from "./types";
import { isValidKey } from "./keys";
import { mediaUrl } from "../media-url";

const DEFAULT_ROOT = "/var/www/avalo-uploads";


export const uploadRoot = (): string =>
  path.resolve(process.env.UPLOAD_DIR || DEFAULT_ROOT);

/**
 * key → 絕對路徑，並確認結果真的落在根目錄底下。
 *
 * key 是我們自己產的（見 keys.ts），照理不可能含 `..`；但這一步只花一行，
 * 而少了它、哪天有人讓 key 接受外部輸入，就是一個任意檔案寫入。
 * 這是經典錯誤，不值得省。
 */
export function resolveKeyPath(key: string): string {
  if (!isValidKey(key)) throw new Error("invalid storage key");
  const root = uploadRoot();
  const full = path.resolve(root, key);
  // path.resolve 之後再比一次前綴：正規化過的路徑才擋得住 ../ 與符號連結式的花招。
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("storage key escapes root");
  }
  return full;
}

export const localDiskStorage: Storage = {
  async put(key, data, _contentType) {
    const full = resolveKeyPath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return { key, bytes: data.byteLength };
  },

  async remove(key) {
    let full: string;
    try {
      full = resolveKeyPath(key);
    } catch {
      // key 本身就不合法 → 沒有檔案可刪，當作已完成。
      // 清掃程序的目標是「沒有檔案被留下」，這個狀態已經滿足。
      return;
    }
    try {
      await fs.unlink(full);
    } catch (e) {
      // 檔案不存在算成功（重跑清掃、或部署換機時的常態）
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  },

  // 網址由 media-url.ts 組（那個檔不含 node 模組，客戶端元件也用得到）。
  // 這裡保留在介面上只是為了讓伺服器端的呼叫點不必多 import 一個模組。
  url(key) {
    return mediaUrl(key);
  },

  async size(key) {
    try {
      const st = await fs.stat(resolveKeyPath(key));
      return st.size;
    } catch {
      return 0;
    }
  },
};
