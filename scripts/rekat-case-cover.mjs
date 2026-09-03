// 產生主站案例區的封面圖 public/cases/rekat.jpg（1200×750 JPG）。
//
// 沿用其他案例的視覺公式：暖色背景 + 微微傾斜的瀏覽器 mockup + 陰影，
// 裡面放該站最有辨識度的那一屏。這裡放的是 Hero：REKAT 字標、
// 標了回溫點與一爆的烘焙曲線，以及三十年／15 支／9 個產地的數字列。
//
// 內容有更動時重跑：  node scripts/rekat-case-cover.mjs
import sharp from "sharp";

const OUT = "public/cases/rekat.jpg";

const INK = "#14120F";
const INK2 = "#3E3931";
const MUTE = "#6E6656";
const PAPER = "#F7F4EE";
const PAPER2 = "#FFFDF9";
const LINE = "#DED7C9";
const ACCENT = "#1B4B5A";
const EMBER = "#A9522B";

// SVG 是 XML：文字裡的 & 一定要跳脫，否則 librsvg 直接解析失敗
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── 烘焙曲線（與站上 _data/knowledge.ts 的 ROAST_CURVE 同一組點）──
const CURVE = [
  [0, 188], [0.5, 128], [1, 100], [1.5, 92], [2.5, 108], [3.5, 129],
  [4.5, 149], [5.5, 165], [6.5, 178], [7.5, 188], [8.5, 196], [9.2, 200], [10, 205],
];
const PX0 = 494, PX1 = 812, PY0 = 214, PY1 = 372;
const px = (t) => PX0 + (t / 10.6) * (PX1 - PX0);
const py = (v) => PY1 - ((v - 80) / 135) * (PY1 - PY0);
const curvePath = CURVE.map(([t, v], i) => `${i ? "L" : "M"}${px(t).toFixed(1)},${py(v).toFixed(1)}`).join(" ");

// 背景那幾條等高線，畫的是品牌名 Rekat（水乾）的那條溪
const creek = Array.from({ length: 5 }, (_, i) =>
  `<path d="M-20 ${150 + i * 96} C 200 ${110 + i * 100} 360 ${300 + i * 84} 560 ${240 + i * 96} S 800 ${140 + i * 104} 920 ${210 + i * 92}"
     fill="none" stroke="${LINE}" stroke-width="${i === 2 ? 1.4 : 0.9}" opacity="${i === 2 ? 0.85 : 0.4}"/>`,
).join("\n        ");

const NAV = ["豆單", "咖啡知識", "沖煮指南", "關於日卡地"];
let nx = 470;
const navSvg = NAV.map((t) => {
  const g = `<text x="${nx}" y="84" font-family="'PingFang TC',sans-serif" font-size="13" fill="${INK2}">${esc(t)}</text>`;
  nx += t.length * 13 + 26;
  return g;
}).join("\n        ");

const FACTS = [["30", "年", "烘豆資歷"], ["15", "", "本期品項"], ["9", "", "產地國"]];
const factsSvg = FACTS.map(([n, sup, label], i) => {
  const x = 34 + i * 272;
  return `<text x="${x}" y="596" font-family="'SF Mono',Menlo,monospace" font-size="42" fill="${INK}">${n}<tspan font-size="17" fill="${MUTE}" dx="4">${sup}</tspan></text>
        <text x="${x}" y="620" font-family="'PingFang TC',sans-serif" font-size="12" fill="${MUTE}">${esc(label)}</text>
        ${i < 2 ? `<line x1="${x + 248}" y1="556" x2="${x + 248}" y2="628" stroke="${LINE}" stroke-width="1"/>` : ""}`;
}).join("\n        ");

const TAGS = ["日卡地自然農莊", "淺焙 / 中焙", "半磅 227g"];
let tx = 34;
const tagsSvg = TAGS.map((t) => {
  const w = t.length * 12.5 + 22;
  const g = `<rect x="${tx}" y="404" width="${w}" height="26" rx="13" fill="none" stroke="${LINE}" stroke-width="1"/>
        <text x="${tx + 11}" y="421" font-family="'PingFang TC',sans-serif" font-size="12" fill="${INK2}">${esc(t)}</text>`;
  tx += w + 9;
  return g;
}).join("\n        ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EDE6DA"/>
      <stop offset="55%" stop-color="#F2EDE3"/>
      <stop offset="100%" stop-color="#E4DDD0"/>
    </linearGradient>
    <radialGradient id="glow" cx="20%" cy="14%" r="58%">
      <stop offset="0%" stop-color="${EMBER}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${EMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="82%" cy="80%" r="46%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="26" stdDeviation="26" flood-color="#3B332A" flood-opacity="0.24"/>
    </filter>
    <clipPath id="screen"><rect x="0" y="0" width="880" height="700" rx="14"/></clipPath>
  </defs>

  <rect width="1200" height="750" fill="url(#bg)"/>
  <rect width="1200" height="750" fill="url(#glow)"/>
  <rect width="1200" height="750" fill="url(#glow2)"/>

  <g transform="rotate(-0.9 610 400)" filter="url(#shadow)">
    <g transform="translate(170,95)">
      <g clip-path="url(#screen)">
        <rect width="880" height="700" fill="${PAPER}"/>

        <!-- 瀏覽器標題列 -->
        <rect width="880" height="46" fill="${PAPER2}"/>
        <line x1="0" y1="46" x2="880" y2="46" stroke="#E7E0D2" stroke-width="1"/>
        <circle cx="26" cy="23" r="6" fill="#E9705F"/>
        <circle cx="47" cy="23" r="6" fill="#E8C15C"/>
        <circle cx="68" cy="23" r="6" fill="#8FBF6B"/>
        <rect x="92" y="12" width="240" height="23" rx="6" fill="#F0EADF"/>
        <text x="106" y="28" font-family="'SF Mono',Menlo,monospace" font-size="12" fill="#6F6759">rekat.avalokite.xyz</text>

        <!-- 溪的等高線 -->
        ${creek}

        <!-- 站內導覽 -->
        <text x="34" y="80" font-family="'Jost',Helvetica,sans-serif" font-size="17" letter-spacing="5" fill="${INK}">REKAT</text>
        <text x="34" y="93" font-family="'SF Mono',Menlo,monospace" font-size="7.5" letter-spacing="2" fill="${MUTE}">ROASTERY・日卡地自然農莊</text>
        ${navSvg}
        <rect x="790" y="68" width="56" height="26" rx="13" fill="${PAPER2}" stroke="${LINE}" stroke-width="1"/>
        <text x="812" y="85" font-family="'SF Mono',Menlo,monospace" font-size="11" fill="${INK2}">0</text>

        <!-- Hero 左：字標 -->
        <text x="30" y="248" font-family="'Jost',Helvetica,sans-serif" font-weight="300" font-size="76" letter-spacing="10" fill="${INK}">REKAT</text>
        <text x="34" y="288" font-family="'Jost',Helvetica,sans-serif" font-weight="300" font-size="27" letter-spacing="13" fill="${MUTE}">ROASTERY</text>
        <text x="34" y="332" font-family="'Songti TC','PingFang TC',serif" font-size="19" fill="${INK}">三十年烘豆。</text>
        <text x="34" y="362" font-family="'Songti TC','PingFang TC',serif" font-size="19" fill="${INK}">只停在一爆之後、二爆之前。</text>
        ${tagsSvg}

        <!-- Hero 右：烘焙曲線卡 -->
        <rect x="466" y="150" width="380" height="256" fill="${PAPER2}" stroke="${LINE}" stroke-width="1"/>
        <text x="484" y="176" font-family="'SF Mono',Menlo,monospace" font-size="9" letter-spacing="1.8" fill="${MUTE}">ROAST PROFILE</text>
        <text x="484" y="196" font-family="'PingFang TC',sans-serif" font-size="14" font-weight="600" fill="${INK}">一鍋淺焙，十分鐘</text>
        <text x="828" y="176" text-anchor="end" font-family="'SF Mono',Menlo,monospace" font-size="9" fill="${MUTE}">豆溫 °C ／ 分鐘</text>
        <line x1="${PX0}" y1="${PY1}" x2="${PX1}" y2="${PY1}" stroke="${LINE}" stroke-width="1"/>
        <rect x="${px(8.5).toFixed(1)}" y="${PY0}" width="${(px(10) - px(8.5)).toFixed(1)}" height="${PY1 - PY0}" fill="${EMBER}" opacity="0.09"/>
        <text x="${((px(8.5) + px(10)) / 2).toFixed(1)}" y="${PY0 + 10}" text-anchor="middle" font-family="'SF Mono',Menlo,monospace" font-size="7.5" fill="${EMBER}">DTR 15%</text>
        <path d="${curvePath}" fill="none" stroke="${EMBER}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${px(1.5).toFixed(1)}" cy="${py(92).toFixed(1)}" r="4.4" fill="${PAPER2}" stroke="${EMBER}" stroke-width="2"/>
        <text x="${px(1.5).toFixed(1)}" y="${(py(92) + 16).toFixed(1)}" text-anchor="middle" font-family="'PingFang TC',sans-serif" font-size="8.5" fill="${MUTE}">回溫點</text>
        <circle cx="${px(8.5).toFixed(1)}" cy="${py(196).toFixed(1)}" r="4.4" fill="${EMBER}"/>
        <text x="${(px(8.5) - 8).toFixed(1)}" y="${(py(196) - 9).toFixed(1)}" text-anchor="end" font-family="'PingFang TC',sans-serif" font-size="8.5" fill="${INK}">一爆</text>
        <line x1="484" y1="386" x2="828" y2="386" stroke="#EFE9DD" stroke-width="1"/>
        <text x="484" y="399" font-family="'PingFang TC',sans-serif" font-size="10.5" fill="${MUTE}">細胞壁被內部壓力撐開——一爆是分水嶺，在此之後每一秒都在改寫風味。</text>

        <!-- 數字列 -->
        <line x1="34" y1="556" x2="846" y2="556" stroke="${LINE}" stroke-width="1"/>
        ${factsSvg}
      </g>
      <rect width="880" height="700" rx="14" fill="none" stroke="#D6CDBC" stroke-width="1"/>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile(OUT);
console.log("wrote", OUT);
