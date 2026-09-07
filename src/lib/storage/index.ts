// 儲存驅動的選擇。搬 S3 時只動這個檔（新增 ./s3 並在這裡多一個分支）。

import type { Storage } from "./types";
import { localDiskStorage } from "./local-disk";

export type { Storage } from "./types";
export { storageKey, thumbKey, isThumbKey, isValidKey, tenantOfKey, KEY_RE } from "./keys";

/**
 * 目前只有本機磁碟一種。
 *
 * 刻意不預先寫一個「未來的 S3 分支」放在這裡——沒有實作可選的分支只是
 * 看起來有彈性。真的要搬的時候，這裡加三行、新增 s3.ts，就這樣。
 */
export const storage: Storage = localDiskStorage;
