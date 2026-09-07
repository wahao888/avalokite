// 從店家提供的 logo 原圖產出網站要用的資產。
//
// 原圖是黑字壓在純黃底（rgb 255,199,52）的 JPG，沒有向量檔。
// 純色底去背很乾淨：用亮度反推 alpha，邊緣的抗鋸齒會被完整保留，
// 比先二值化再描邊更忠於手寫筆畫。
//
// 重跑： node scripts/monsieurlong-logo.mjs
import sharp from "sharp";

const SRC = "scripts/assets/monsieurlong-logo-source.jpg";
const DIR = "public/sites/monsieurlong";
const YELLOW = { r: 255, g: 199, b: 50 };

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

// 背景亮度取四角，不寫死——換一張原圖也還能跑
const bgL =
  [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]
    .map(([x, y]) => lum((y * W + x) * C))
    .reduce((a, b) => a + b, 0) / 4;

/** 把一塊區域轉成「黑字 + alpha」的 RGBA buffer */
function cut(x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((y + y0) * W + (x + x0)) * C;
      const dst = (y * w + x) * 4;
      // 越暗越不透明。下限砍掉 JPEG 在黃底上的雜訊，上限讓筆畫核心完全實心。
      const a = Math.min(1, Math.max(0, (1 - lum(src) / bgL - 0.1) / 0.8));
      out[dst] = 0;
      out[dst + 1] = 0;
      out[dst + 2] = 0;
      out[dst + 3] = Math.round(a * 255);
    }
  }
  return { out, w, h };
}

/** 找出某個水平帶裡墨跡的邊界 */
function bbox(yFrom, yTo) {
  const thr = bgL * 0.65;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = yFrom; y <= yTo; y++)
    for (let x = 0; x < W; x++) {
      if (lum((y * W + x) * C) < thr) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const full = bbox(0, H - 1);
const pad = Math.round(full.w * 0.015);
const lock = cut(full.x0 - pad, full.y0 - pad, full.w + pad * 2, full.h + pad * 2);

// ① 導覽列用的橫式標準組合，透明背景
await sharp(lock.out, { raw: { width: lock.w, height: lock.h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(`${DIR}/logo.png`);
console.log(`logo.png            ${lock.w}×${lock.h}`);

// ② 只有手寫字的版本：小尺寸下 MONSIEUR 會糊成一團，32px 的磚與其他地方都用這份「只有手寫字」版本（MONSIEUR 在小尺寸下讀不到）
const gapEnd = (() => {
  // 兩段之間的空白帶：從整組的頂端往下找第一段連續無墨的列
  const thr = bgL * 0.65;
  const ink = (y) => { for (let x = 0; x < W; x++) if (lum((y * W + x) * C) < thr) return true; return false; };
  let run = 0;
  for (let y = full.y0; y <= full.y1; y++) {
    if (!ink(y)) { run++; if (run >= 6 && y + 1 <= full.y1 && ink(y + 1)) return y + 1; }
    else run = 0;
  }
  return full.y0;
})();
const script = bbox(gapEnd, full.y1);
const sPad = Math.round(script.w * 0.02);
const sc = cut(script.x0 - sPad, script.y0 - sPad, script.w + sPad * 2, script.h + sPad * 2);
await sharp(sc.out, { raw: { width: sc.w, height: sc.h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(`${DIR}/wordmark.png`);
console.log(`wordmark.png        ${sc.w}×${sc.h}  （只有 long. 手寫字）`);

// ③ favicon：黃底方磚 + 置中的標準組合（＝店家 IG 大頭貼的樣子）
const tile = async (size, inset, src = lock) => {
  const inner = Math.round(size * inset);
  // 輸入是 raw，一定要指定輸出格式再 toBuffer，否則 sharp 不知道要編成什麼
  const mark = await sharp(src.out, { raw: { width: src.w, height: src.h, channels: 4 } })
    .resize({ width: inner })
    .png()
    .toBuffer({ resolveWithObject: true });
  return sharp({
    create: { width: size, height: size, channels: 4, background: YELLOW },
  })
    .composite([{ input: mark.data, top: Math.round((size - mark.info.height) / 2), left: Math.round((size - inner) / 2) }])
    .png({ compressionLevel: 9 });
};
await (await tile(512, 0.72)).toFile(`${DIR}/icon.png`);
// 32px 只放手寫字：分頁那麼小，MONSIEUR 只會變成一條灰渣
await (await tile(32, 0.82, sc)).toFile(`${DIR}/icon-32.png`);
console.log("icon.png            512×512\nicon-32.png         32×32");

