// AmberPick 的 OG 圖（1200×630）。
//
// 這張圖會出現在 LINE 群組的預覽卡上——那是客人看到這個站的第一眼。
//
// 為什麼用腳本產出 PNG 而不是 Next 的 ImageResponse：
//   ・這張圖幾乎不會變，沒必要每次請求都算一次（正式站是 t3.micro）
//   ・proxy 的比對排除帶副檔名的路徑，所以 /og.png 只能是靜態檔
// 商品頁有自己的 OG（用商品主圖），這張是首頁與分享站台本身時的門面。
//
// 執行：node scripts/amber-og.mjs

import sharp from "sharp";

const W = 1200;
const H = 630;

const PAPER = "#faf9f6";
const INK = "#2b2925";
const SUB = "#8c867d";
const AMBER = "#a8763a";
const LINE = "#e9e5de";

/** 標誌：旋轉 45 度的圓角方形（寶石）＋中心的點（被挑中的那一個） */
const mark = (cx, cy, size, stroke) => {
  const s = size * 0.566; // 旋轉後外接尺寸換算回邊長
  return `
    <g transform="translate(${cx} ${cy})">
      <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}"
            rx="${size * 0.13}" transform="rotate(45)"
            fill="none" stroke="${AMBER}" stroke-width="${stroke}"/>
      <circle cx="0" cy="0" r="${size * 0.115}" fill="${AMBER}"/>
    </g>`;
};

// 背景的細線。日雜版面常見的網格感，但要淡到幾乎看不見——
// 它的作用是讓大片留白不空，不是讓人看見它。
const rules = Array.from({ length: 7 }, (_, i) => {
  const y = 90 + i * 75;
  return `<line x1="90" y1="${y}" x2="${W - 90}" y2="${y}" stroke="${LINE}" stroke-width="1"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g opacity="0.55">${rules}</g>

  ${mark(190, 315, 150, 7)}

  <text x="330" y="292" font-family="Helvetica, Arial, sans-serif"
        font-size="76" font-weight="600" fill="${INK}" letter-spacing="0.5">Amber<tspan
        font-weight="300" fill="${SUB}" letter-spacing="4">Pick</tspan></text>

  <text x="332" y="352" font-family="'PingFang TC', 'Heiti TC', sans-serif"
        font-size="30" fill="${SUB}" letter-spacing="3">各國連線代購・正品直送</text>

  <line x1="332" y1="392" x2="560" y2="392" stroke="${AMBER}" stroke-width="2"/>

  <text x="332" y="440" font-family="'PingFang TC', 'Heiti TC', sans-serif"
        font-size="24" fill="${SUB}" letter-spacing="2">連線期間隨時加購・同一檔合併一次出貨</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/sites/amber/og.png");
console.log("寫入 public/sites/amber/og.png");
