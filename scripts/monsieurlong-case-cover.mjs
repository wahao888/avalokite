// 產生主站案例區的封面圖 public/cases/monsieurlong.jpg（1200×750 JPG）。
//
// 沿用其他案例的視覺公式：暖色背景 + 微微傾斜的瀏覽器 mockup + 陰影，
// 裡面放該站最有辨識度的那一屏。這裡放的是 Hero：品牌黃灌滿的 LONG.、
// 今日口味跑馬燈，以及跑馬燈下緣融化的滴垂。
//
// 內容有更動時重跑：  node scripts/monsieurlong-case-cover.mjs
import sharp from "sharp";

const OUT = "public/cases/monsieurlong.jpg";

const INK = "#16130F";
const YELLOW = "#FFC732";
const PAPER = "#F7F2E7";
const PAPER2 = "#FFFDF7";

// 與 MeltEdge.tsx 的 DRIP_PATH 同一條曲線（0–100 的座標空間）
const DRIP =
  "M0,0 C12,2 22,8 30,28 C34,38 10,52 10,70 C10,88 28,100 50,100 " +
  "C72,100 90,88 90,70 C90,52 66,38 70,28 C78,8 88,2 100,0 Z";

// 跑馬燈下緣的滴垂：x（相對面板左緣）、寬、長
const drips = [
  [40, 34, 26], [92, 15, 11], [128, 52, 46], [196, 19, 15],
  [246, 28, 22], [292, 44, 38], [360, 17, 13], [400, 38, 31],
  [462, 22, 18], [500, 56, 48], [572, 16, 12], [612, 32, 26],
  [668, 24, 20], [716, 42, 35], [782, 18, 14],
];

const dripSvg = drips
  .map(
    ([x, w, h]) =>
      `<path d="${DRIP}" fill="${YELLOW}" transform="translate(${x},486) scale(${(w / 100).toFixed(3)},${(h / 100).toFixed(3)})"/>`,
  )
  .join("\n      ");

// SVG 是 XML：文字裡的 & 一定要跳脫，否則 librsvg 直接解析失敗
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const flavours = [
  ["經典巧克力", "CLASSIC CHOCOLATE"],
  ["夏日", "SUMMER"],
  ["花生油條", "PEANUT & YOUTIAO"],
  ["開心果", "PISTACHIO"],
];

let fx = 34;
const marqueeSvg = flavours
  .map(([zh, en]) => {
    const g = `<text x="${fx}" y="471" font-family="'PingFang TC','Songti TC',Georgia,serif" font-size="21" font-weight="600" fill="${INK}">${esc(zh)}</text>
      <text x="${fx + zh.length * 21 + 12}" y="470" font-family="'SF Mono',Menlo,monospace" font-size="11" letter-spacing="1.6" fill="${INK}" opacity="0.62">${esc(en)}</text>
      <circle cx="${fx + zh.length * 21 + 26 + en.length * 8.2}" cy="466" r="3.6" fill="${INK}"/>`;
    fx += zh.length * 21 + 62 + en.length * 8.2;
    return g;
  })
  .join("\n      ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EFE4C9"/>
      <stop offset="55%" stop-color="#F2EBDA"/>
      <stop offset="100%" stop-color="#E8DFC9"/>
    </linearGradient>
    <radialGradient id="glow" cx="22%" cy="16%" r="55%">
      <stop offset="0%" stop-color="${YELLOW}" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="${YELLOW}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobA" cx="34%" cy="32%" r="52%">
      <stop offset="0%" stop-color="#FFDE8A"/><stop offset="58%" stop-color="#FFDE8A"/>
      <stop offset="100%" stop-color="#FFDE8A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobB" cx="36%" cy="34%" r="52%">
      <stop offset="0%" stop-color="#F0BFC7"/><stop offset="58%" stop-color="#F0BFC7"/>
      <stop offset="100%" stop-color="#F0BFC7" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="26" stdDeviation="26" flood-color="#4A3B22" flood-opacity="0.26"/>
    </filter>
    <clipPath id="screen"><rect x="0" y="0" width="880" height="700" rx="14"/></clipPath>
  </defs>

  <rect width="1200" height="750" fill="url(#bg)"/>
  <rect width="1200" height="750" fill="url(#glow)"/>

  <g transform="rotate(-0.9 610 400)" filter="url(#shadow)">
    <g transform="translate(170,95)">
      <g clip-path="url(#screen)">
        <rect width="880" height="700" fill="${PAPER}"/>

        <!-- 瀏覽器標題列 -->
        <rect width="880" height="46" fill="${PAPER2}"/>
        <line x1="0" y1="46" x2="880" y2="46" stroke="#E2D9C6" stroke-width="1"/>
        <circle cx="26" cy="23" r="6" fill="#E9705F"/>
        <circle cx="47" cy="23" r="6" fill="#E8C15C"/>
        <circle cx="68" cy="23" r="6" fill="#8FBF6B"/>
        <rect x="92" y="12" width="252" height="23" rx="6" fill="#F2EADA"/>
        <text x="106" y="28" font-family="'SF Mono',Menlo,monospace" font-size="12" fill="#6F6759">monsieurlong.avalokite.xyz</text>

        <!-- Hero 的色塊場 -->
        <g filter="url(#soft)" opacity="0.42">
          <ellipse cx="118" cy="126" rx="150" ry="120" fill="url(#blobA)"/>
          <ellipse cx="702" cy="132" rx="160" ry="130" fill="url(#blobA)"/>
          <ellipse cx="742" cy="322" rx="168" ry="140" fill="url(#blobB)"/>
        </g>

        <!-- 站內導覽 -->
        <rect x="34" y="62" width="30" height="30" rx="6" fill="${YELLOW}"/>
        <text x="43" y="84" font-family="Georgia,serif" font-style="italic" font-size="16" fill="${INK}">l.</text>
        <text x="74" y="79" font-family="Georgia,serif" font-size="16" fill="${INK}">Monsieur Long</text>
        <text x="74" y="92" font-family="'PingFang TC',sans-serif" font-size="9" letter-spacing="2" fill="#8B8172">隆先生・大稻埕</text>
        <g font-family="'PingFang TC',sans-serif" font-size="12.5" fill="${INK}">
          <text x="470" y="83">口味</text>
          <text x="524" y="83">活動與合作</text>
          <text x="606" y="83">店舖</text>
        </g>
        <rect x="712" y="64" width="96" height="28" rx="14" fill="${INK}"/>
        <text x="731" y="83" font-family="'PingFang TC',sans-serif" font-size="12" fill="${PAPER}">合作邀請</text>

        <!-- Hero 文字 -->
        <text x="34" y="146" font-family="'SF Mono',Menlo,monospace" font-size="11" letter-spacing="2.6" fill="#8F5E00">YOUR MOOD YOUR SCOOP</text>
        <text x="34" y="166" font-family="'PingFang TC',sans-serif" font-size="11.5" letter-spacing="1.4" fill="#4A4238">今日供應 8 款・售完為止</text>

        <text x="30" y="248" font-family="Georgia,'Times New Roman',serif" font-size="82" letter-spacing="-1" fill="${INK}">MONSIEUR</text>

        <!-- LONG. ：墨色偏移影 → 描邊 → 品牌黃填色 -->
        <text x="37" y="325" font-family="Georgia,'Times New Roman',serif" font-size="82" letter-spacing="-1" fill="${INK}">LONG.</text>
        <text x="33" y="321" font-family="Georgia,'Times New Roman',serif" font-size="82" letter-spacing="-1" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round">LONG.</text>
        <text x="33" y="321" font-family="Georgia,'Times New Roman',serif" font-size="82" letter-spacing="-1" fill="${YELLOW}">LONG.</text>

        <text x="34" y="356" font-family="'PingFang TC',sans-serif" font-size="15" fill="${INK}">大稻埕貴德街上的手工 Gelato，每天現做，每天不一樣。</text>

        <rect x="34" y="372" width="118" height="34" rx="17" fill="${INK}"/>
        <text x="53" y="394" font-family="'PingFang TC',sans-serif" font-size="13" fill="${PAPER}">看今天有什麼</text>
        <rect x="162" y="372" width="94" height="34" rx="17" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <text x="184" y="394" font-family="'PingFang TC',sans-serif" font-size="13" fill="${INK}">前往店舖</text>

        <!-- 今日口味跑馬燈 + 融化的下緣 -->
        <rect x="0" y="440" width="880" height="46" fill="${YELLOW}"/>
        <line x1="0" y1="440" x2="880" y2="440" stroke="${INK}" stroke-width="1.6"/>
        ${marqueeSvg}
        ${dripSvg}

        <!-- 今日供應板 -->
        <rect x="34" y="556" width="812" height="150" rx="10" fill="${PAPER2}" stroke="${INK}" stroke-width="1.6"/>
        <rect x="34" y="556" width="812" height="38" rx="10" fill="${YELLOW}"/>
        <rect x="34" y="580" width="812" height="14" fill="${YELLOW}"/>
        <line x1="34" y1="594" x2="846" y2="594" stroke="${INK}" stroke-width="1.6"/>
        <text x="52" y="582" font-family="'PingFang TC','Songti TC',serif" font-size="15" font-weight="600" fill="${INK}">今日 Gelato 口味</text>
        <g font-family="'PingFang TC',sans-serif" font-size="13" fill="${INK}">
          <circle cx="60" cy="620" r="6" fill="#F4E4C6" stroke="${INK}" stroke-width="1.2"/><text x="76" y="624">鹽之花牛奶</text>
          <circle cx="60" cy="656" r="6" fill="#6E6058" stroke="${INK}" stroke-width="1.2"/><text x="76" y="660">椒香芝麻</text>
          <circle cx="60" cy="692" r="6" fill="#4A2E23" stroke="${INK}" stroke-width="1.2"/><text x="76" y="696">經典巧克力</text>
          <circle cx="460" cy="620" r="6" fill="#F5A93F" stroke="${INK}" stroke-width="1.2"/><text x="476" y="624">夏日</text>
          <circle cx="460" cy="656" r="6" fill="#A9BE7B" stroke="${INK}" stroke-width="1.2"/><text x="476" y="660">開心果</text>
          <circle cx="460" cy="692" r="6" fill="#F0A028" stroke="${INK}" stroke-width="1.2"/><text x="476" y="696">茂谷柑金桔</text>
        </g>
      </g>
      <rect width="880" height="700" rx="14" fill="none" stroke="#D8CDB6" stroke-width="1"/>
    </g>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toFile(OUT);
console.log("wrote", OUT);
