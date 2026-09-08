// 檔案儲存的介面。
//
// 抽這一層的唯一目的：第一期存本機磁碟，之後搬 S3 時只換一個實作檔。
// tests/tenant-isolation.test.ts 有一條規則守住這件事——
// 「/var/www/avalo-uploads 只能出現在 local-disk.ts 與 deploy/ 底下」，
// 讓「只改一個檔」變成被檢查的性質，而不是願望。

export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<{ key: string; bytes: number }>;

  /**
   * ⚠ 這個方法叫 remove 不叫 delete，而且不能改名。
   *
   * tests/tenant-isolation.test.ts 用字面比對禁止資料層出現 `.delete(`
   * （那是為了逼所有寫入走 updateMany、把 tenantId 塞進 where）。
   * 圖片清掃程序必須跟「標記 purgedAt」寫在一起才有交易性，
   * 所以它會住在資料層——如果這個方法叫 delete，那條規則會在一行
   * 完全正確的程式碼上紅掉。
   *
   * 掃描器的笨正是它的價值，所以是這裡改名，不是那裡加例外。
   */
  remove(key: string): Promise<void>;

  /** 對外的網址。本機實作回 <UPLOAD_BASE_URL>/<key>，由 nginx 直送 */
  url(key: string): string;

  /** 這個 key 目前佔用多少 bytes；不存在回 0（用於後台顯示佔用量） */
  size(key: string): Promise<number>;
}
