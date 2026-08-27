// 從 src/app/icon.svg 產生 src/app/favicon.ico（多尺寸）。
//
//   node scripts/make-favicon.mjs
//
// 為什麼還需要 .ico：icon.svg 已經涵蓋現代瀏覽器，但瀏覽器與各家爬蟲仍會
// 固定去要 /favicon.ico，沒有這支就是每次都吃 404（2026-08-26 的日誌兩週 26 次）。
// Next 的慣例是放在 app/ 根目錄，會自動輸出 <link rel="icon" href="/favicon.ico" sizes="any" />。
//
// 這支只在改 logo 時需要重跑，產物有進版控，正常建置不會用到它。
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const SIZES = [16, 32, 48]; // 16=分頁列、32=工作列／書籤、48=Windows 捷徑
const svg = await readFile(new URL("../src/app/icon.svg", import.meta.url), "utf8");

// 16px 專用的簡化版：原圖那兩圈細線在 16px 會糊成一團灰，A 也認不出來。
// 小尺寸只留識別記號、放大加粗，是 favicon 的常規做法（32／48 仍用完整 logo）。
// 想改回「帶一圈」的版本，把下面那行 circle 的註解拿掉即可。
const svg16 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#F0EBE3"/>
  <g transform="translate(32,33)">
    <g transform="scale(1.9)" stroke="#5F7155" stroke-width="4.4" stroke-linecap="round" fill="none">
      <path d="M0,-11 L-7.5,11"/>
      <path d="M0,-11 L7.5,11"/>
      <path d="M-4.3,3.8 Q0,1.3 4.3,3.8"/>
    </g>
  </g>
</svg>`;

// density 拉高：讓 sharp 先以高解析度光柵化再縮圖，邊緣才不會鋸齒
const pngs = await Promise.all(
  SIZES.map((s) =>
    sharp(Buffer.from(s === 16 ? svg16 : svg), { density: 384 })
      .resize(s, s)
      .png({ compressionLevel: 9 })
      .toBuffer()
  )
);

// ICO 容器：6 bytes 檔頭 + 每張 16 bytes 目錄項 + 影像資料。
// 影像直接塞 PNG（Vista 之後的格式，所有現役瀏覽器都吃）。
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(pngs.length, 4);

let offset = 6 + pngs.length * 16;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(SIZES[i] >= 256 ? 0 : SIZES[i], 0); // 0 代表 256
  e.writeUInt8(SIZES[i] >= 256 ? 0 : SIZES[i], 1);
  e.writeUInt8(0, 2); // 調色盤色數，全彩填 0
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});

const out = new URL("../src/app/favicon.ico", import.meta.url);
await writeFile(out, Buffer.concat([header, ...entries, ...pngs]));
console.log(`favicon.ico 已產生：${SIZES.join("／")}px，共 ${Buffer.concat([header, ...entries, ...pngs]).length} bytes`);
