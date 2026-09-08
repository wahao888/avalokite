"use client";

// 前端圖片壓縮。這一段同時解決兩個問題，而且**兩個都只能在瀏覽器解**：
//
// ① 手機原圖太大。iPhone 一張照片 3–5MB，在韓國的 4G 上傳要十幾秒；
//    壓到長邊 1600、JPEG q0.82 之後約 150–350KB，1–3 秒就好。
//    這也讓 nginx 的 client_max_body_size 2m 可以維持不動。
//
// ② HEIC。實測 sharp 0.35.3 的預編譯 libvips 雖然含 libheif 1.23.1，
//    但 format.heif.input.fileSuffix === ['.avif']——只編了 AV1，
//    沒有 HEVC 解碼器（專利授權），**伺服器解不了 iPhone 的 HEIC**。
//    而 iOS 的 WebKit 有系統解碼器，所以在瀏覽器裡畫進 canvas 就順手轉掉了。
//
// 桌機 Chrome 拿到 .heic 會失敗，這是已知且可接受的限制——訊息要講清楚，
// 不要靜默失敗讓她以為圖傳上去了。

import {
  TARGET_EDGE,
  QUALITY_STEPS,
  MAX_BYTES,
  fitWithin,
  type Size,
} from "@/lib/image-resize";

export class CompressError extends Error {
  constructor(
    message: string,
    /** 給使用者看的中文訊息 */
    public userMessage: string,
  ) {
    super(message);
    this.name = "CompressError";
  }
}

export type Compressed = {
  blob: Blob;
  width: number;
  height: number;
};

/**
 * 解碼成點陣圖。
 *
 * imageOrientation: "from-image" 是 EXIF 方向的修正，不能省——
 * drawImage(HTMLImageElement) 歷來不套 EXIF，createImageBitmap 不給這個
 * 選項也不套，結果就是她直拍的照片在網站上變成橫的。
 *
 * 舊版 Safari 不支援 createImageBitmap 的 options（甚至沒有這個函式），
 * 退回 <img> 路徑。那條路徑會自己套 EXIF（瀏覽器渲染 <img> 時就會），
 * 所以方向一樣是對的。
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 可能是不支援 options，也可能是格式解不開。先試沒有 options 的版本，
      // 真的不行才落到 <img>。
      try {
        return await createImageBitmap(file);
      } catch {
        /* 落到下面的 <img> 路徑 */
      }
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new CompressError(
          "decode failed",
          "這個檔案瀏覽器無法讀取。如果是 iPhone 的 HEIC 檔，請改用手機直接拍照上傳，或到「設定 → 相機 → 格式」選「最相容」。",
        ),
      );
    };
    img.src = url;
  });
}

const sizeOf = (src: ImageBitmap | HTMLImageElement): Size =>
  "naturalWidth" in src
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * 壓縮一張照片。
 *
 * 品質迴圈：0.82 → 0.7 → 0.6，最多三輪。全景照與高細節的圖在 0.82 下
 * 可能還是超過 1.5MB，但降到 0.6 之後幾乎一定過得去。
 */
export async function compressImage(file: File): Promise<Compressed> {
  const src = await decode(file);
  const natural = sizeOf(src);
  if (natural.width < 1 || natural.height < 1) {
    throw new CompressError("empty image", "這個檔案不是有效的圖片。");
  }

  const target = fitWithin(natural, TARGET_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CompressError("no 2d context", "瀏覽器無法處理圖片，請換一個瀏覽器試試。");

  ctx.drawImage(src as CanvasImageSource, 0, 0, target.width, target.height);
  if ("close" in src) src.close();

  let blob: Blob | null = null;
  for (const q of QUALITY_STEPS) {
    blob = await toBlob(canvas, q);
    if (!blob) continue;

    // ⚠ 一定要檢查回來的型別。舊 Safari 被要求它不支援的格式時會**無聲**
    // 退回 PNG，而一張 1600px 的 PNG 可能有 4MB，會直接撞破 nginx 的
    // client_max_body_size。這也是這裡的目標格式選 JPEG 不選 WebP 的原因。
    if (blob.type !== "image/jpeg") {
      throw new CompressError(
        `unexpected blob type ${blob.type}`,
        "瀏覽器無法輸出 JPEG，請改用 Safari 或 Chrome 的最新版本。",
      );
    }
    if (blob.size <= MAX_BYTES) break;
  }

  if (!blob) throw new CompressError("toBlob returned null", "圖片壓縮失敗，請再試一次。");
  if (blob.size > MAX_BYTES) {
    throw new CompressError(
      "still too large",
      "這張圖片太大了（可能是全景照）。請裁切之後再上傳。",
    );
  }

  return { blob, width: target.width, height: target.height };
}

export type UploadResult = {
  id: string;
  key: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
};

/**
 * 壓縮並上傳一張照片。
 *
 * uploadId 由客戶端產生並在重試時沿用——4G 上「其實成功了但逾時」很常見，
 * 沒有這個冪等鍵就會產生兩張一樣的圖。伺服器看到重複的 uploadId 會直接
 * 回傳既有的那一列。
 */
export async function uploadPhoto(
  file: File,
  opts: { uploadId?: string; productId?: string; signal?: AbortSignal } = {},
): Promise<UploadResult> {
  const { blob, width, height } = await compressImage(file);
  const uploadId = opts.uploadId ?? crypto.randomUUID();

  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  form.append("uploadId", uploadId);
  form.append("width", String(width));
  form.append("height", String(height));
  if (opts.productId) form.append("productId", opts.productId);

  const res = await fetch("/api/portal/amber/upload", {
    method: "POST",
    body: form,
    signal: opts.signal,
  });

  if (res.status === 401) {
    // ⚠ 呼叫端必須把壓好的 blob 留在記憶體、讓她重新登入之後重送。
    // 丟掉一次 30 秒的上架比 401 本身糟糕得多。
    throw new CompressError("unauthorized", "登入已過期，請重新登入後再試一次。");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new CompressError(`upload failed ${res.status}`, text || "上傳失敗，請再試一次。");
  }
  return (await res.json()) as UploadResult;
}

/**
 * 併發度 2 的上傳佇列。
 *
 * 為什麼不是全部並行：伺服器端 sharp 解一張 1600px JPEG 的工作集約 30MB，
 * 而正式站是一台 908MB 的 t3.micro。五張並行加上 Node 本身會很緊。
 * 為什麼不是序列：那會白白浪費一半的時間，而「上傳與她打字並行」正是
 * 30 秒上架預算的大半。
 */
export const UPLOAD_CONCURRENCY = 2;

export async function uploadPhotos(
  files: File[],
  handlers: {
    onStart?: (index: number, file: File) => void;
    onDone?: (index: number, result: UploadResult) => void;
    onError?: (index: number, error: CompressError | Error) => void;
  } = {},
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, async () => {
    while (next < files.length) {
      const i = next++;
      handlers.onStart?.(i, files[i]);
      try {
        handlers.onDone?.(i, await uploadPhoto(files[i]));
      } catch (e) {
        handlers.onError?.(i, e as Error);
      }
    }
  });
  await Promise.all(workers);
}
