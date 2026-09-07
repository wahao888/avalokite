import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { storageKey, thumbKey, isThumbKey, isValidKey, tenantOfKey, KEY_RE } from "@/lib/storage/keys";
import { localDiskStorage, resolveKeyPath, uploadRoot } from "@/lib/storage/local-disk";

describe("儲存 key", () => {
  it("形狀：<tenant>/<yyyy>/<mm>/<亂數>.jpg", () => {
    const k = storageKey("amber", new Date("2026-09-20T10:00:00Z"));
    expect(k).toMatch(KEY_RE);
    expect(k.startsWith("amber/2026/09/")).toBe(true);
  });

  it("用台北時間分月（她在首爾上架時 UTC 可能還是上個月的最後一天）", () => {
    // UTC 2026-09-30 17:00 = 台北 2026-10-01 01:00
    const k = storageKey("amber", new Date("2026-09-30T17:00:00Z"));
    expect(k.startsWith("amber/2026/10/")).toBe(true);
  });

  it("每次都不同（1000 個不重複）", () => {
    const keys = new Set(Array.from({ length: 1000 }, () => storageKey("amber")));
    expect(keys.size).toBe(1000);
  });

  it("縮圖 key 是單射的，且留在同一個目錄", () => {
    const a = storageKey("amber");
    const b = storageKey("amber");
    expect(thumbKey(a)).not.toBe(thumbKey(b));
    expect(path.dirname(thumbKey(a))).toBe(path.dirname(a));
    expect(isThumbKey(thumbKey(a))).toBe(true);
    expect(isThumbKey(a)).toBe(false);
  });

  it("縮圖 key 也算合法（清掃程序要能刪它）", () => {
    expect(isValidKey(thumbKey(storageKey("amber")))).toBe(true);
  });

  it("拒絕任何可能跳出目錄的 key", () => {
    for (const bad of [
      "",
      "../../etc/passwd",
      "amber/../../etc/passwd.jpg",
      "/etc/passwd.jpg",
      "amber\\2026\\09\\x.jpg",
      "amber/2026/09/x.jpg\0.png",
      "amber/2026/09/x.png", // 只收 jpg
      "amber/2026/9/x.jpg", // 月份要兩位數
      "a".repeat(300),
    ]) {
      expect(isValidKey(bad), bad.slice(0, 40)).toBe(false);
    }
  });

  it("取得 key 的租戶（清掃與稽核用）", () => {
    expect(tenantOfKey(storageKey("amber"))).toBe("amber");
    expect(tenantOfKey("../evil.jpg")).toBeNull();
  });
});

describe("本機磁碟儲存", () => {
  let tmp: string;
  const prevDir = process.env.UPLOAD_DIR;
  const prevBase = process.env.UPLOAD_BASE_URL;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "avalo-upload-test-"));
    process.env.UPLOAD_DIR = tmp;
    process.env.UPLOAD_BASE_URL = "/u";
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    if (prevDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = prevDir;
    if (prevBase === undefined) delete process.env.UPLOAD_BASE_URL;
    else process.env.UPLOAD_BASE_URL = prevBase;
  });

  it("寫入會自動建目錄，並回報實際 bytes", async () => {
    const key = storageKey("amber");
    const data = Buffer.from("fake-jpeg-bytes");
    const out = await localDiskStorage.put(key, data, "image/jpeg");
    expect(out.bytes).toBe(data.byteLength);
    expect(await fs.readFile(path.join(tmp, key))).toEqual(data);
  });

  it("size 讀得到，刪掉之後回 0", async () => {
    const key = storageKey("amber");
    await localDiskStorage.put(key, Buffer.alloc(1234), "image/jpeg");
    expect(await localDiskStorage.size(key)).toBe(1234);
    await localDiskStorage.remove(key);
    expect(await localDiskStorage.size(key)).toBe(0);
  });

  it("刪一個不存在的檔案算成功（清掃可重跑）", async () => {
    await expect(localDiskStorage.remove(storageKey("amber"))).resolves.toBeUndefined();
  });

  it("刪一個不合法的 key 也不炸（清掃遇到髒資料不該整批停住）", async () => {
    await expect(localDiskStorage.remove("../../etc/passwd")).resolves.toBeUndefined();
  });

  it("寫入時的 key 必須合法，跳出根目錄一律拋錯", async () => {
    await expect(
      localDiskStorage.put("../escape.jpg", Buffer.alloc(1), "image/jpeg"),
    ).rejects.toThrow();
    expect(() => resolveKeyPath("amber/../../x.jpg")).toThrow();
  });

  it("解析出來的路徑一定在根目錄底下", () => {
    const key = storageKey("amber");
    expect(resolveKeyPath(key).startsWith(uploadRoot() + path.sep)).toBe(true);
  });

  it("對外網址由 UPLOAD_BASE_URL 決定（正式站由 nginx 直送，不經 Node）", () => {
    const key = storageKey("amber");
    expect(localDiskStorage.url(key)).toBe(`/u/${key}`);
    process.env.UPLOAD_BASE_URL = "https://cdn.example.com/";
    expect(localDiskStorage.url(key)).toBe(`https://cdn.example.com/${key}`);
  });
});

describe("上傳目錄不可落在 repo 樹內", () => {
  it("預設路徑在 /opt 底下，不在專案目錄裡", () => {
    const prev = process.env.UPLOAD_DIR;
    delete process.env.UPLOAD_DIR;
    try {
      const root = uploadRoot();
      const repo = path.resolve(__dirname, "..");
      // deploy 的 rsync --delete 會清掉 repo 樹底下的執行期檔案，
      // 上傳目錄落在裡面等於每次部署都刪光客戶的商品照片。
      expect(root.startsWith(repo + path.sep)).toBe(false);
      expect(root).toBe("/opt/avalo/uploads");
    } finally {
      if (prev !== undefined) process.env.UPLOAD_DIR = prev;
    }
  });
});
