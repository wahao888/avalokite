// 產生 Monsieur Long 的 OG 分享圖（1200×630 PNG）。
//
// 為什麼是腳本而不是 Next 的 ImageResponse：
// 這張圖幾乎不會變，沒必要每次請求都算一次；而且客戶站的 /og.png 走不到
// app 路由（proxy.ts 的 matcher 排除帶副檔名的路徑），只能是 public/ 的靜態檔。
//
// 內容有更動時重跑：  node scripts/monsieurlong-og.mjs
import sharp from "sharp";

const OUT = "public/sites/monsieurlong/og.png";

// 右下角的四球冰，用網站上真的存在的口味色
const scoops = [
  { c: "#E9A8B8", x: 828, y: 470, r: 66 }, // 荔枝
  { c: "#A9BE7B", x: 944, y: 498, r: 58 }, // 開心果
  { c: "#F0A028", x: 1046, y: 462, r: 62 }, // 茂谷柑金桔
  { c: "#59372A", x: 1132, y: 512, r: 46 }, // 比利時巧克力
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F7F2E7"/>

  <!-- 頂部融化的黃色帶 -->
  <path d="M0,0 H1200 V148 C1080,148 1060,232 960,232 C860,232 840,148 740,148
           C640,148 620,216 520,216 C420,216 400,148 300,148
           C200,148 180,228 80,228 C40,228 20,192 0,174 Z" fill="#FFC732"/>
  <circle cx="300" cy="258" r="13" fill="#FFC732"/>

  ${scoops
    .map(
      (s) =>
        `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.c}" stroke="#16130F" stroke-width="5"/>`,
    )
    .join("\n  ")}

  <text x="80" y="368" font-family="Georgia, 'Times New Roman', serif" font-size="104" fill="#16130F" letter-spacing="-1">MONSIEUR LONG</text>
  <text x="84" y="420" font-family="'PingFang TC', 'Heiti TC', Helvetica, Arial, sans-serif" font-size="28" fill="#4A4238" letter-spacing="4">隆先生・大稻埕貴德街 59 號</text>

  <rect x="80" y="458" width="132" height="46" rx="23" fill="#16130F"/>
  <text x="101" y="488" font-family="Helvetica, Arial, sans-serif" font-size="19" fill="#FFC732" letter-spacing="2">GELATO</text>
  <text x="232" y="488" font-family="'PingFang TC', Helvetica, Arial, sans-serif" font-size="21" fill="#4A4238" letter-spacing="1">每天現做，每天不一樣</text>

  <text x="80" y="576" font-family="Georgia, serif" font-size="27" fill="#8F5E00" letter-spacing="3">YOUR MOOD YOUR SCOOP</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT);
