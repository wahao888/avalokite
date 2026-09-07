import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { getTenantSession } from "@/lib/tenant-auth";
import { sameOrigin } from "@/lib/portal-http";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { createImage, sweepImages } from "@/lib/daigou-data";
import { storage, storageKey, thumbKey } from "@/lib/storage";
import {
  TARGET_EDGE,
  THUMB_EDGE,
  THUMB_QUALITY,
  SERVER_MAX_BYTES,
  looksLikeJpeg,
} from "@/lib/image-resize";

// 商品照上傳。
//
// 刻意掛在 /api/portal/ 底下：tests/tenant-isolation.test.ts 對這個目錄有
// 兩條既有規則（POST 必須 sameOrigin、非 login 的路由必須 getTenantSession），
// 放在這裡等於白拿那兩層檢查，而且日後有人新增端點也自動被守到。
//
// 每個請求恰好一個檔案。這不是偷懶——「一次一張」正是讓 nginx 的
// client_max_body_size 2m 維持成有意義安全控制的原因，而且每張圖有各自的
// 進度與重試（她站在韓國店裡用 4G，一張失敗不該拖垮另外四張）。

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 她是連續爆發式上傳（一次八張很正常），所以窗口開大一點 */
const RATE = { windowMs: 10 * 60_000, max: 120 };

/** 主圖的 JPEG 品質。sharp 的 quality 是 0–100，跟前端的 0–1 不同單位 */
const MAIN_QUALITY = 82;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  // getTenantSession 已同時比對 Host 與 cookie 內的 slug
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  if (rateLimited(`upload:${tenant.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  // nginx 的上限是 2m；這一層是縱深防禦，免得哪天有人「修好」nginx。
  if (file.size > SERVER_MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }

  const uploadId = String(form.get("uploadId") ?? "").trim() || null;
  if (uploadId && uploadId.length > 64) {
    return NextResponse.json({ error: "invalid uploadId" }, { status: 400 });
  }
  const productId = String(form.get("productId") ?? "").trim() || null;
  if (productId && productId.length > 40) {
    return NextResponse.json({ error: "invalid productId" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());

  // ⚠ 嗅探 magic bytes，不看 Content-Type——那是使用者送來的字串。
  // 前端一律輸出 JPEG，所以這裡只收 JPEG；收到別的表示不是走正常流程。
  if (!looksLikeJpeg(input)) {
    return NextResponse.json({ error: "not a jpeg" }, { status: 400 });
  }

  // ── CPU 工作在前，DB 寫入在後 ──────────────────────────────
  // 同 REKAT 的「先寫 DB 再寄信」紀律：不要在 sharp 跑的時候占著
  // SQLite 的寫入鎖。連線尖峰時那把鎖是全站共用的。
  let main: Buffer;
  let thumb: Buffer;
  let width: number;
  let height: number;

  try {
    // 重新編碼本身就是安全控制，不只是縮圖：polyglot 檔案活不過重新編碼。
    // 而且 sharp 預設**不保留** EXIF——這點很重要，iPhone 照片帶著
    // 韓國那家店與她住家的 GPS 座標，直接對外等於洩漏行蹤與貨源。
    const pipeline = sharp(input, { failOn: "error" }).rotate(); // rotate() 無參數＝依 EXIF 轉正

    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: "unreadable image" }, { status: 400 });
    }

    main = await pipeline
      .clone()
      .resize({ width: TARGET_EDGE, height: TARGET_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: MAIN_QUALITY, mozjpeg: true })
      .toBuffer();

    // 縮圖由伺服器產，不由客戶端產——「一次一張」的規則要守住。
    // 客戶端做只有它能做的事（HEIC、EXIF 方向、大幅縮小），
    // 伺服器從一個已經安全的 JPEG 產衍生檔。
    // 20 張縮圖 30KB vs 250KB，是 4G 上格狀列表「能用」與「不能用」的差別。
    thumb = await pipeline
      .clone()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: Math.round(THUMB_QUALITY * 100), mozjpeg: true })
      .toBuffer();

    const outMeta = await sharp(main).metadata();
    width = outMeta.width ?? meta.width;
    height = outMeta.height ?? meta.height;
  } catch {
    return NextResponse.json({ error: "image processing failed" }, { status: 400 });
  }

  const key = storageKey(tenant.slug);
  await storage.put(key, main, "image/jpeg");
  await storage.put(thumbKey(key), thumb, "image/jpeg");

  // createImage 用 uploadId 做冪等：4G 上「成功但逾時」的重送會拿回既有那一列，
  // 不會產生兩張一樣的圖。（此時磁碟上會多一份孤兒檔案，由 sweepImages 回收。）
  const row = await createImage(tenant.slug, {
    key,
    width,
    height,
    bytes: main.byteLength + thumb.byteLength,
    uploadId,
    productId,
  });

  // 機會式清掃：不用 cron，改成在她活動的時候順手掃一點——
  // 那正好就是檔案累積的時候，而且自動節流。失敗不影響本次上傳。
  void sweepImages(tenant.slug, 20).catch(() => {});

  return NextResponse.json({
    id: row.id,
    key: row.key,
    url: storage.url(row.key),
    thumbUrl: storage.url(thumbKey(row.key)),
    width: row.width,
    height: row.height,
  });
}
