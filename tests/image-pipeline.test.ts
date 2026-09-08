import { describe, it, expect } from "vitest";
import sharp, { type Exif } from "sharp";

import {
  fitWithin,
  looksLikeJpeg,
  TARGET_EDGE,
  THUMB_EDGE,
  QUALITY,
  THUMB_QUALITY,
  MAX_BYTES,
  QUALITY_STEPS,
  SERVER_MAX_BYTES,
} from "@/lib/image-resize";

// 這一組刻意真的跑 sharp。上傳端點的兩個關鍵性質（剝 EXIF、依 EXIF 轉正）
// 是 sharp 的行為而不是我們的程式碼，所以只有實際跑一次才證明得了——
// 而且如果哪天 sharp 或 libvips 換版把預設改掉，這裡會紅。

describe("縮放參數", () => {
  it("常數被釘住（改動要是有意識的）", () => {
    expect(TARGET_EDGE).toBe(1600);
    expect(THUMB_EDGE).toBe(400);
    expect(QUALITY).toBe(0.82);
    expect(THUMB_QUALITY).toBe(0.7);
    expect(MAX_BYTES).toBe(1_500_000);
    expect(QUALITY_STEPS).toEqual([0.82, 0.7, 0.6]);
    // nginx 是 2m；伺服器端這個是縱深防禦，必須比它寬鬆一點才不會
    // 在 nginx 之前先擋掉，導致錯誤訊息變成 nginx 的 413 而不是我們的 JSON。
    expect(SERVER_MAX_BYTES).toBeGreaterThan(2 * 1024 * 1024);
  });

  it("等比縮到長邊不超過上限", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("本來就比較小的圖不放大（放大只會變大不會變清楚）", () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("正好等於上限時不動", () => {
    expect(fitWithin({ width: 1600, height: 900 }, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("極端長條的圖短邊至少 1px（0 會讓 canvas 與 sharp 都拋錯）", () => {
    expect(fitWithin({ width: 4000, height: 1 }, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it("尺寸為 0 不會產生 NaN", () => {
    expect(fitWithin({ width: 0, height: 0 }, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe("JPEG 嗅探（絕不信任 Content-Type）", () => {
  it("認得 JPEG 的 magic bytes", () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });
  it("PNG、GIF、空的、太短的一律拒絕", () => {
    expect(looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false); // PNG
    expect(looksLikeJpeg(new Uint8Array([0x47, 0x49, 0x46]))).toBe(false); // GIF
    expect(looksLikeJpeg(new Uint8Array([]))).toBe(false);
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});

describe("sharp 重新編碼（上傳端點的實際行為）", () => {
  const blank = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } });

  /** 造一張帶 EXIF（含 GPS）的假照片，模擬 iPhone 在店裡拍出來的東西 */
  async function fakePhoto(opts: { width?: number; height?: number } = {}) {
    const { width = 2400, height = 1600 } = opts;
    return (
      blank(width, height)
        // sharp 的 Exif 型別只列了 IFD0～IFD3，沒有 GPS，但執行期是支援的
        // （下面「原始檔真的帶著 EXIF」那條測試就是在確認這件事）。
        .withExif({
          IFD0: { Make: "Apple", Model: "iPhone 15 Pro" },
          GPS: {
            GPSLatitudeRef: "N",
            GPSLatitude: "37/1 33/1 0/1", // 首爾
            GPSLongitudeRef: "E",
            GPSLongitude: "126/1 58/1 0/1",
          },
        } as unknown as Exif)
        .jpeg()
        .toBuffer()
    );
  }

  /**
   * 造一張「直拍」的照片。
   * 注意方向要用 withMetadata({orientation}) 而不是 withExif 的 IFD0.Orientation——
   * 後者寫不進去（實測讀回來仍是 1），會讓這條測試變成空跑。
   */
  async function fakeRotatedPhoto(width: number, height: number, orientation: number) {
    return blank(width, height).withMetadata({ orientation }).jpeg().toBuffer();
  }

  /** 上傳端點主圖那一段的等價處理 */
  const processMain = (input: Buffer) =>
    sharp(input, { failOn: "error" })
      .rotate()
      .resize({ width: TARGET_EDGE, height: TARGET_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

  it("原始檔真的帶著 EXIF 與 GPS（確認這個測試不是空跑）", async () => {
    const meta = await sharp(await fakePhoto()).metadata();
    expect(meta.exif).toBeTruthy();
    expect(meta.exif!.length).toBeGreaterThan(0);
  });

  it("⚠ 處理後 EXIF 被剝掉——她的照片帶著韓國那家店與住家的 GPS 座標", async () => {
    const out = await processMain(await fakePhoto());
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeFalsy();
  });

  it("長邊縮到 1600，比例不變", async () => {
    const out = await processMain(await fakePhoto({ width: 2400, height: 1600 }));
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1600);
    expect(Math.round((meta.height ?? 0) / 100)).toBe(11); // 1066～1067
  });

  it("小於 1600 的圖不會被放大", async () => {
    const out = await processMain(await fakePhoto({ width: 800, height: 600 }));
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it("fixture 真的帶著 Orientation=6（確認這條不是空跑）", async () => {
    const src = await fakeRotatedPhoto(2400, 1600, 6);
    expect((await sharp(src).metadata()).orientation).toBe(6);
  });

  it("依 EXIF 方向轉正：Orientation=6 的直拍照片寬高會對調", async () => {
    // Orientation 6 = 要順時針轉 90 度才是正的。少了 rotate()，
    // 她直拍的商品照在網站上會全部躺著。
    const src = await fakeRotatedPhoto(2400, 1600, 6);
    const out = await processMain(src);
    const meta = await sharp(out).metadata();
    expect(meta.height).toBeGreaterThan(meta.width!);
  });

  it("沒有 rotate() 就會躺著（證明那一行是必要的，不是儀式）", async () => {
    const src = await fakeRotatedPhoto(2400, 1600, 6);
    const withoutRotate = await sharp(src, { failOn: "error" })
      .resize({ width: TARGET_EDGE, height: TARGET_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg()
      .toBuffer();
    const meta = await sharp(withoutRotate).metadata();
    expect(meta.width).toBeGreaterThan(meta.height!);
  });

  it("輸出是 JPEG，且開頭就是 JPEG 的 magic bytes", async () => {
    const out = await processMain(await fakePhoto());
    expect((await sharp(out).metadata()).format).toBe("jpeg");
    expect(looksLikeJpeg(new Uint8Array(out))).toBe(true);
  });

  it("縮圖明顯比主圖小（4G 上格狀列表能不能用的差別）", async () => {
    const src = await fakePhoto();
    const main = await processMain(src);
    const thumb = await sharp(src, { failOn: "error" })
      .rotate()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: Math.round(THUMB_QUALITY * 100), mozjpeg: true })
      .toBuffer();

    expect((await sharp(thumb).metadata()).width).toBe(THUMB_EDGE);
    expect(thumb.byteLength).toBeLessThan(main.byteLength);
  });

  it("壞掉的位元組會拋錯而不是產生半張圖", async () => {
    const junk = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(200, 0x41)]);
    await expect(processMain(junk)).rejects.toThrow();
  });

  it("⚠ 伺服器解不了 HEIC（HEVC）——這就是壓縮必須放在前端的原因", () => {
    // 預編譯的 libvips 含 libheif，但只編了 AV1；HEVC 解碼器因專利授權
    // 不在預設建置裡。sharp 自己宣告的可接受副檔名就只有 .avif。
    // 若哪天這一行變了（sharp 換了建置方式），前端那段轉檔就可以簡化。
    expect(sharp.format.heif.input.fileSuffix).toEqual([".avif"]);
  });
});
