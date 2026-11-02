// 主站 OG 圖（1200×630）與 JSON-LD logo（512×512）。
//
//   node scripts/avalo-og.mjs
//
// 改品牌標語時重跑。產物進版控；建置過程不會呼叫這支。
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const PAPER = "#F0EBE3";
const INK = "#2F2B26";
const MOSS = "#5F7155";
const WOOD = "#A98467";
const SAGE = "#8A9A7B";
const MUTE = "#8C8478";

const mark = `
  <g transform="translate(32,33)">
    <circle r="24" fill="none" stroke="${WOOD}" stroke-width="2" stroke-linecap="round"
            stroke-dasharray="94 14 32 10" transform="rotate(-30)" opacity="0.85"/>
    <circle r="18" fill="none" stroke="${SAGE}" stroke-width="2" stroke-linecap="round"
            stroke-dasharray="46 11 41 16" transform="rotate(40)" opacity="0.8"/>
    <g stroke="${MOSS}" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M0,-11 L-7.5,11"/>
      <path d="M0,-11 L7.5,11"/>
      <path d="M-4.3,3.8 Q0,1.3 4.3,3.8"/>
    </g>
  </g>`;

function og({ kicker, title, sub }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="0" y="0" width="12" height="630" fill="${MOSS}"/>
  <g transform="translate(72 72) scale(1.35)">${mark}</g>
  <text x="180" y="118" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="${MUTE}" letter-spacing="8">AVALO</text>
  <text x="72" y="230" font-family="'PingFang TC', 'Noto Sans TC', 'Hiragino Sans', sans-serif" font-size="22" fill="${WOOD}" letter-spacing="4">${kicker}</text>
  <text x="72" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="${INK}">${title}</text>
  <text x="72" y="400" font-family="'PingFang TC', 'Noto Sans TC', sans-serif" font-size="28" fill="${MUTE}">${sub}</text>
  <text x="72" y="560" font-family="Georgia, serif" font-size="20" fill="${MOSS}" letter-spacing="3">avalokite.xyz</text>
</svg>`;
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${PAPER}"/>
  ${mark}
</svg>`;

await mkdir("public/brand", { recursive: true });
await sharp(Buffer.from(og({
  kicker: "台北網頁設計 · 企業 AI",
  title: "價格先講清楚",
  sub: "形象官網、商務網站、LINE AI 客服",
}))).png({ compressionLevel: 9 }).toFile("public/og.png");

await sharp(Buffer.from(og({
  kicker: "Taipei web design · enterprise AI",
  title: "Prices, published first",
  sub: "Brand sites, commerce, LINE AI support",
}))).png({ compressionLevel: 9 }).toFile("public/og-en.png");

await sharp(Buffer.from(logo)).png({ compressionLevel: 9 }).toFile("public/brand/avalo-logo-512.png");
console.log("wrote public/og.png public/og-en.png public/brand/avalo-logo-512.png");
