// 產生 REKAT ROASTERY 的 OG 分享圖（1200×630 PNG）。
//
// 為什麼是腳本而不是 Next 的 ImageResponse：
// 這張圖幾乎不會變，沒必要每次請求都算一次；而且客戶站的 /og.png 走不到
// app 路由（proxy.ts 的 matcher 排除帶副檔名的路徑），只能是 public/ 的靜態檔。
//
// 內容有更動時重跑：  node scripts/rekat-og.mjs
import sharp from "sharp";

const OUT = "public/sites/rekat/og.png";

const PAPER = "#F7F4EE";
const INK = "#14120F";
const MUTE = "#857C6D";
const LINE = "#DED7C9";
const EMBER = "#A9522B";

// 首頁那條烘焙曲線的縮圖版。點是 (分鐘, 豆溫)，投影到右半邊。
const curve = [
  [0, 188], [0.5, 128], [1, 100], [1.5, 92], [2.5, 108], [3.5, 129],
  [4.5, 149], [5.5, 165], [6.5, 178], [7.5, 188], [8.5, 196], [9.2, 200], [10, 205],
];
const X0 = 680, X1 = 1130, Y0 = 190, Y1 = 430;
const px = (t) => X0 + (t / 10.6) * (X1 - X0);
const py = (v) => Y1 - ((v - 80) / (215 - 80)) * (Y1 - Y0);
const path = curve.map(([t, v], i) => `${i ? "L" : "M"}${px(t).toFixed(1)},${py(v).toFixed(1)}`).join(" ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>

  <!-- 背景等高線：品牌名 Rekat（水乾）的那條溪 -->
  ${Array.from({ length: 6 }, (_, i) =>
    `<path d="M-40 ${150 + i * 62} C 260 ${100 + i * 66} 440 ${300 + i * 54} 720 ${230 + i * 62} S 1100 ${120 + i * 68} 1260 ${200 + i * 60}" fill="none" stroke="${LINE}" stroke-width="${i === 2 ? 1.6 : 1}" opacity="${i === 2 ? 0.9 : 0.45}"/>`
  ).join("\n  ")}

  <!-- 烘焙曲線 -->
  <path d="${path}" fill="none" stroke="${EMBER}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${px(1.5).toFixed(1)}" cy="${py(92).toFixed(1)}" r="6" fill="${PAPER}" stroke="${EMBER}" stroke-width="3"/>
  <circle cx="${px(8.5).toFixed(1)}" cy="${py(196).toFixed(1)}" r="6" fill="${EMBER}"/>
  <text x="${px(8.5).toFixed(1)}" y="${(py(196) - 18).toFixed(1)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="${MUTE}" letter-spacing="1">一爆</text>

  <!-- 咖啡豆落款 -->
  <g transform="translate(150 300)">
    <circle r="96" fill="none" stroke="${LINE}" stroke-width="1.6"/>
    <circle r="86" fill="none" stroke="${LINE}" stroke-width="1" stroke-dasharray="3 8"/>
    <ellipse rx="60" ry="42" fill="${INK}"/>
    <path d="M-44 0 C -32 -16 -20 10 0 10 S 32 -16 44 0" fill="none" stroke="${PAPER}" stroke-width="4.5" stroke-linecap="round"/>
  </g>

  <text x="300" y="248" font-family="Helvetica, Arial, sans-serif" font-weight="300" font-size="96" fill="${INK}" letter-spacing="14">REKAT</text>
  <text x="304" y="300" font-family="Helvetica, Arial, sans-serif" font-weight="300" font-size="34" fill="${MUTE}" letter-spacing="16">ROASTERY</text>
  <text x="304" y="368" font-family="'PingFang TC', 'Heiti TC', Helvetica, Arial, sans-serif" font-size="30" fill="${INK}" letter-spacing="3">日卡地自然農莊・台東鹿野</text>

  <line x1="304" y1="404" x2="1130" y2="404" stroke="${LINE}" stroke-width="1"/>

  <text x="304" y="452" font-family="'PingFang TC', 'Heiti TC', Helvetica, Arial, sans-serif" font-size="26" fill="#3E3931" letter-spacing="2">三十年烘豆・只停在一爆之後、二爆之前</text>

  <rect x="150" y="512" width="126" height="42" rx="21" fill="${INK}"/>
  <text x="170" y="540" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="${PAPER}" letter-spacing="2">BEANS</text>
  <text x="300" y="540" font-family="'PingFang TC', Helvetica, Arial, sans-serif" font-size="21" fill="${MUTE}" letter-spacing="1">可娜・藝伎・藍山・曼特寧　半磅原豆　三包優惠</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT);
