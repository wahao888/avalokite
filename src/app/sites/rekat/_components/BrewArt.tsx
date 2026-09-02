/* ═══════════════════════════════════════════════════════════════
   沖煮器具插畫

   跟豆子插畫同一套邏輯：線稿、單一強調色、沒有照片。
   客戶沒有器材照，而且器材照通常長得像購物網站——線稿反而更接近
   「這是一份指南」的語氣。

   全部是純 SVG、無 JS，尺寸由外層 CSS 決定。
   ═══════════════════════════════════════════════════════════════ */

const INK = "var(--rk-ink)";
const LINE = "var(--rk-ink-2)";
const TINT = "var(--rk-paper-3)";
const WATER = "var(--rk-accent)";
const EMBER = "var(--rk-ember)";

const stroke = {
  fill: "none",
  stroke: LINE,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type BrewKey = "v60" | "clever" | "aeropress" | "french" | "espresso";

function Art({ method }: { method: BrewKey }) {
  switch (method) {
    // 手沖濾杯：錐形濾杯架在下壺上，水柱從上面進來、咖啡液從底下滴出去
    case "v60":
      return (
        <>
          {/* 水柱。要一路畫進濾杯口（y=46），斷在半空中會看起來像一條沒關係的線 */}
          <path
            d="M60 2c-3 9 4 14 1 22s-3 12-1 21"
            stroke={WATER}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          {/* 濾杯 */}
          <path d="M28 46h64L64 88H56L28 46z" fill={TINT} stroke={LINE} strokeWidth="1.6" strokeLinejoin="round" />
          <ellipse cx="60" cy="46" rx="32" ry="7" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 導流肋骨 */}
          <path d="M42 50l14 34M60 50v34M78 50L64 84" {...stroke} strokeWidth="1" opacity="0.5" />
          {/* 下壺 */}
          <path d="M38 100h44v22a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8v-22z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M36 100h48" {...stroke} />
          {/* 已萃出的咖啡液 */}
          <path d="M40 116h40v6a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8v-6z" fill={EMBER} opacity="0.5" stroke="none" />
          {/* 滴落 */}
          <circle cx="60" cy="93" r="2" fill={EMBER} />
          <circle cx="60" cy="106" r="1.4" fill={EMBER} opacity="0.6" />
        </>
      );

    // 聰明濾杯：一樣是錐形，但底下有閥門關著，水整杯泡在裡面
    case "clever":
      return (
        <>
          <path d="M28 40h64L64 86H56L28 40z" fill={TINT} stroke={LINE} strokeWidth="1.6" strokeLinejoin="round" />
          <ellipse cx="60" cy="40" rx="32" ry="7" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 浸泡中的水位 */}
          <path d="M35 54h50L64 82H56L35 54z" fill={WATER} opacity="0.24" stroke="none" />
          <path d="M35 54h50" stroke={WATER} strokeWidth="1.6" fill="none" />
          {/* 底部閥門（關著） */}
          <rect x="50" y="86" width="20" height="10" rx="2" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          <path d="M55 91h10" stroke={EMBER} strokeWidth="2" strokeLinecap="round" />
          {/* 底座 */}
          <path d="M40 100h40v6H40z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M46 106v18M74 106v18M40 124h40" {...stroke} />
          {/* 計時：浸泡是靠時間不是靠技術 */}
          <circle cx="98" cy="30" r="11" fill="none" stroke={LINE} strokeWidth="1.4" />
          <path d="M98 24v6l4 3" stroke={EMBER} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      );

    // 愛樂壓：圓筒＋活塞，往下壓
    case "aeropress":
      return (
        <>
          {/* 活塞把手 */}
          <rect x="46" y="6" width="28" height="6" rx="3" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          <path d="M60 12v18" {...stroke} strokeWidth="2.4" />
          {/* 壓力方向 */}
          <path d="M92 14v20M92 34l-4-5M92 34l4-5" stroke={EMBER} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* 圓筒 */}
          <rect x="38" y="30" width="44" height="62" rx="3" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M38 44h44" {...stroke} strokeWidth="1" opacity="0.45" />
          {/* 筒內的咖啡 */}
          <rect x="41" y="52" width="38" height="37" fill={EMBER} opacity="0.35" />
          {/* 濾蓋 */}
          <path d="M36 92h48v6H36z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 杯子 */}
          <path d="M42 102h36v18a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8v-18z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M78 108h6a6 6 0 0 1 0 12h-6" {...stroke} />
        </>
      );

    // 法式濾壓壺：玻璃壺＋金屬濾網往下壓，粉渣沉在底部
    case "french":
      return (
        <>
          {/* 蓋與壓桿 */}
          <ellipse cx="60" cy="18" rx="9" ry="4" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          <path d="M60 22v14" {...stroke} strokeWidth="2.2" />
          <path d="M34 36h52v8H34z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 壺身 */}
          <path d="M34 44h52v72a10 10 0 0 1-10 10H44a10 10 0 0 1-10-10V44z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          {/* 咖啡液 */}
          <path d="M37 62h46v54a8 8 0 0 1-8 8H45a8 8 0 0 1-8-8V62z" fill={EMBER} opacity="0.3" stroke="none" />
          {/* 濾網（金屬網會留下油脂，這是 Body 最厚的原因） */}
          <path d="M60 44v14" {...stroke} strokeWidth="2.2" />
          <path d="M38 58h44" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M42 61h36" stroke={LINE} strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.7" />
          {/* 沉在底部的粉渣 */}
          {[[46, 116], [55, 119], [64, 116], [73, 119], [50, 122], [68, 122]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill={LINE} opacity="0.45" />
          ))}
          {/* 把手 */}
          <path d="M86 56h8a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-8" {...stroke} />
        </>
      );

    // 義式濃縮：把手＋雙出口，杯裡有一層 crema
    case "espresso":
      return (
        <>
          {/* 沖煮頭 */}
          <path d="M40 10h40v14H40z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 把手 */}
          <path d="M36 26h48v12H36z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M84 30h18a5 5 0 0 1 0 10H84" {...stroke} />
          {/* 粉碗 */}
          <path d="M44 38h32l-5 14H49l-5-14z" fill={TINT} stroke={LINE} strokeWidth="1.6" strokeLinejoin="round" />
          {/* 雙出口 */}
          <path d="M52 52h6v6h-6zM62 52h6v6h-6z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.4" />
          {/* 兩道油亮的萃取流 */}
          <path d="M55 58c-1 10 0 16 1 24" stroke={EMBER} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M65 58c1 10 0 16-1 24" stroke={EMBER} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {/* 杯 */}
          <path d="M42 86h36v22a10 10 0 0 1-10 10H52a10 10 0 0 1-10-10V86z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M78 92h7a7 7 0 0 1 0 14h-7" {...stroke} />
          {/* crema */}
          <path d="M45 92h30v5H45z" fill={EMBER} opacity="0.55" stroke="none" />
          <ellipse cx="60" cy="86" rx="18" ry="4" fill="none" stroke={LINE} strokeWidth="1.4" />
        </>
      );
  }
}

export default function BrewArt({
  method,
  className,
  title,
}: {
  method: BrewKey;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label={title ? `${title}的器具示意圖` : "沖煮器具示意圖"}
      style={{ display: "block" }}
    >
      <Art method={method} />
    </svg>
  );
}

/* ── 養豆與保存的四張小圖 ─────────────────────────────────── */

export type FreshKey = "degas" | "window" | "grind" | "store";

export function FreshnessArt({ kind }: { kind: FreshKey }) {
  const common = { viewBox: "0 0 80 80", role: "img" as const, style: { display: "block" } };

  switch (kind) {
    // 養豆：袋子上的單向排氣閥正在排出二氧化碳
    case "degas":
      return (
        <svg {...common} aria-label="養豆排氣示意圖">
          <path d="M20 22h40v46a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6V22z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M20 22l6-8h28l6 8" {...stroke} />
          <path d="M26 14h28" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          {/* 單向閥 */}
          <circle cx="40" cy="42" r="7" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          <circle cx="40" cy="42" r="2.4" fill={EMBER} />
          {/* 排出的氣 */}
          <path d="M52 36c5-4 2-8 6-11M60 42c6-3 4-8 8-10" stroke={WATER} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
        </svg>
      );

    // 賞味期：一條隆起又落下的風味曲線，高原落在 7–30 天
    case "window":
      return (
        <svg {...common} aria-label="賞味期曲線示意圖">
          <path d="M8 66h64" stroke={LINE} strokeWidth="1.4" fill="none" />
          <path d="M8 66c8 0 12-30 24-32s20 8 24 14 10 18 16 18" fill="none" stroke={EMBER} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 66c8 0 12-30 24-32s20 8 24 14 10 18 16 18z" fill={EMBER} opacity="0.12" stroke="none" />
          {/* 高原區間 */}
          <path d="M32 66V34M56 66V48" stroke={LINE} strokeWidth="1" strokeDasharray="2 3" fill="none" opacity="0.6" />
          <path d="M32 72h24" stroke={WATER} strokeWidth="2" fill="none" strokeLinecap="round" />
          <text x="44" y="79" textAnchor="middle" fontFamily="var(--rk-mono)" fontSize="7" fill="var(--rk-mute)">
            7–30 DAY
          </text>
        </svg>
      );

    // 研磨：磨盤與磨出來的粉
    case "grind":
      return (
        <svg {...common} aria-label="現磨示意圖">
          <circle cx="40" cy="32" r="20" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <circle cx="40" cy="32" r="7" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {/* 磨刀 */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d="M40 32 L40 14"
              transform={`rotate(${a} 40 32)`}
              stroke={LINE}
              strokeWidth="1.2"
              opacity="0.55"
            />
          ))}
          {/* 落下的粉 */}
          <path d="M28 54h24l-4 18H32l-4-18z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
          {[[34, 62], [40, 66], [46, 62], [37, 69], [44, 69]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill={EMBER} opacity="0.6" />
          ))}
        </svg>
      );

    // 保存：密封罐，外面圍著四個敵人
    case "store":
      return (
        <svg {...common} aria-label="保存方式示意圖">
          <path d="M26 26h28v40a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6V26z" fill={TINT} stroke={LINE} strokeWidth="1.6" />
          <path d="M23 20h34v7H23z" fill="var(--rk-paper-2)" stroke={LINE} strokeWidth="1.6" />
          {[[34, 44], [40, 52], [46, 44], [37, 60], [44, 60]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="4" ry="3" fill={EMBER} opacity="0.35" transform={`rotate(${i * 24} ${x} ${y})`} />
          ))}
          {/* 四個敵人：光、熱、濕、氧 */}
          <g stroke={LINE} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.75">
            <circle cx="12" cy="18" r="4" />
            <path d="M12 10v-3M12 29v-3M4 18H1M23 18h-3" />
            <path d="M68 14c-3 4 2 6-1 10" stroke={EMBER} />
            <path d="M68 62c4-5 4-9 0-13-4 4-4 8 0 13z" />
            <circle cx="12" cy="62" r="4.5" />
            <path d="M12 57.5v9M7.5 62h9" />
          </g>
        </svg>
      );
  }
}
