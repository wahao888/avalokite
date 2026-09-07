// 本機磁碟的儲存實作。
//
// ⚠ 這是整個 repo 裡唯一知道 /opt/avalo/uploads 這個路徑的檔案。
// 有一條結構性測試守住這件事——搬 S3 時只要新增 s3.ts 並改 index.ts 的選擇邏輯。
//
// ⚠⚠ 上傳目錄**必須在 repo 樹之外**。
// deploy/deploy.sh 與 server-update.sh 都用 `rsync --delete`，任何寫進
// repo 樹的執行期檔案都會在下一次部署時被刪光。2026-07-30 就是這樣把
// prod.db 整個刪掉過一次；商品照片沒有 .db 那樣的每日備份，掉了就真的沒了。

import fs from "fs/promises";
import path from "path";
import type { Storage } from "./types";
import { isValidKey } from "./keys";

const DEFAULT_ROOT = "/opt/avalo/uploads";
const DEFAULT_BASE_URL = "/u";

export const uploadRoot = (): string =>
  path.resolve(process.env.UPLOAD_DIR || DEFAULT_ROOT);

const baseUrl = (): string => (process.env.UPLOAD_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

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

  url(key) {
    return `${baseUrl()}/${key}`;
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
