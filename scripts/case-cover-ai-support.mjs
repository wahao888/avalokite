import sharp from "sharp";

// 封面刻意只用數字與英文：sharp 走 librsvg，中文字型在不同機器上不一定裝得到，
// 缺字會變成豆腐方塊，而這張圖是分享到 LINE／FB 時第一個被看到的東西。
const W = 1200;
const H = 750;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2F2B26"/>
      <stop offset="100%" stop-color="#1E1B18"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- 墨流的暗示：與站上的 InkWash 同一個語彙，但不喧賓奪主 -->
  <circle cx="1010" cy="140" r="260" fill="#5F7155" opacity="0.10"/>
  <circle cx="1120" cy="300" r="170" fill="#A98467" opacity="0.07"/>

  <text x="90" y="150" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="6" fill="#A79E92">AVALO &#183; CASE STUDY</text>

  <text x="90" y="330" font-family="Georgia, serif" font-size="150" font-weight="600" fill="#F0EBE3">
    NT$0.011
  </text>
  <text x="90" y="395" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="30" fill="#8C8478">per conversation &#183; measured in production</text>

  <line x1="90" y1="470" x2="1110" y2="470" stroke="#4A443D" stroke-width="1"/>

  <text x="90" y="545" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="46" fill="#9BB08C">88.8%</text>
  <text x="90" y="585" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="20" fill="#8C8478">prompt cache hit</text>

  <text x="430" y="545" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="46" fill="#9BB08C">81</text>
  <text x="430" y="585" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="20" fill="#8C8478">output tokens / reply</text>

  <text x="770" y="545" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="46" fill="#9BB08C">12 h</text>
  <text x="770" y="585" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="20" fill="#8C8478">AI muted after handoff</text>

  <text x="90" y="690" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="3" fill="#6E675E">avalokite.xyz &#183; AI customer service we run ourselves</text>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile("public/cases/avalo-ai-support.jpg");
const meta = await sharp("public/cases/avalo-ai-support.jpg").metadata();
console.log("封面已產生", meta.width + "x" + meta.height, meta.format);
