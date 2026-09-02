import { FAMILY } from "../_data/flavor-wheel";
import type { Bean, Motif } from "../_data/beans";

/* ═══════════════════════════════════════════════════════════════
   豆子插畫產生器

   為什麼是程式畫的 SVG，而不是 15 張圖檔：
   ① 客戶說「沒有什麼照片」。既然要手繪，就讓它自己長出來——新增一支豆子
      只要填一個 motif 與風味家族，插畫自動成立。
   ② 向量、零網路請求、任何尺寸都銳利；購物車 54px 與單品頁 280px 共用同一份。
   ③ 伺服器 CSP 是 img-src 'self'，本來就不能外連圖床。
   王龍提供實拍照後，可在 Bean 加 image 欄位並在卡片優先顯示照片，插畫退為 placeholder。

   構圖：一枚落款印那樣的圓，底下是咖啡豆的側身，上面長出這支豆子的風味母題。
   線條刻意留一點手感（不對稱、粗細不均），但不畫成插畫風——這是精品豆單，不是市集攤。
   ═══════════════════════════════════════════════════════════════ */

/** 同一個 slug 永遠長一樣，但彼此的細節不重複 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function MotifArt({ motif, ink, deep, tint }: { motif: Motif; ink: string; deep: string; tint: string }) {
  const line = {
    fill: "none",
    stroke: deep,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const solid = { fill: ink, stroke: deep, strokeWidth: 1.8, strokeLinejoin: "round" as const };

  switch (motif) {
    // 水蜜桃：一顆帶溝的果實與兩片葉
    case "peach":
      return (
        <g>
          <path d="M100 34c15 0 27 12 27 26 0 15-12 26-27 26s-27-11-27-26c0-14 12-26 27-26z" {...solid} />
          <path d="M100 36c-5 8-6 20-1 24s6 16 1 24" {...line} strokeWidth="1.5" opacity="0.55" />
          <path d="M112 32c9-8 20-9 24-6 3 3-2 13-11 17-6 3-11 2-13 0z" fill={tint} stroke={deep} strokeWidth="1.7" />
          <path d="M119 31c-3 3-5 7-6 11" {...line} strokeWidth="1.2" opacity="0.6" />
        </g>
      );

    // 茉莉：五瓣，中心一點
    case "jasmine":
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx="100"
              cy="42"
              rx="13"
              ry="21"
              transform={`rotate(${a} 100 62)`}
              fill={tint}
              stroke={deep}
              strokeWidth="1.7"
            />
          ))}
          <circle cx="100" cy="62" r="7.5" fill={ink} stroke={deep} strokeWidth="1.6" />
          <path d="M100 62l0-9M100 62l8 5M100 62l-8 5" {...line} strokeWidth="1.2" opacity="0.5" />
        </g>
      );

    // 佛手柑：帶蒂的柑橘與一瓣切面
    case "bergamot":
      return (
        <g>
          <circle cx="92" cy="60" r="26" fill={tint} stroke={deep} strokeWidth="1.9" />
          <path d="M92 34c0-6 3-10 8-12" {...line} strokeWidth="1.8" />
          <path d="M100 22c7-3 13 0 14 4-5 4-11 4-14-4z" fill={ink} stroke={deep} strokeWidth="1.5" />
          <path d="M126 66a17 17 0 1 1-24 15" fill="none" stroke={deep} strokeWidth="1.8" />
          <path d="M126 66a17 17 0 0 0-24 15z" fill={ink} opacity="0.9" stroke={deep} strokeWidth="1.6" />
          <path d="M114 66v15M108 70l6 11M120 70l-6 11" stroke={tint} strokeWidth="1.1" fill="none" opacity="0.85" />
        </g>
      );

    // 莓果：三顆，帶蒂
    case "berry":
      return (
        <g>
          {[
            [82, 60, 17],
            [114, 54, 14],
            [102, 78, 12],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={i === 1 ? tint : ink} stroke={deep} strokeWidth="1.8" />
              <circle cx={x - r * 0.32} cy={y - r * 0.34} r={r * 0.22} fill="#fffdf9" opacity="0.5" />
            </g>
          ))}
          <path d="M82 43v-9M114 40v-8" {...line} strokeWidth="1.6" />
          <path d="M74 36c5-5 12-4 16 1-6 4-13 3-16-1z" fill={tint} stroke={deep} strokeWidth="1.4" />
        </g>
      );

    // 葡萄：一串
    case "grape":
      return (
        <g>
          {[
            [100, 40],
            [86, 54],
            [114, 54],
            [100, 62],
            [79, 70],
            [121, 70],
            [100, 84],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="11" fill={i % 3 === 0 ? tint : ink} stroke={deep} strokeWidth="1.6" />
          ))}
          <path d="M100 29v-9" {...line} strokeWidth="1.7" />
          <path d="M100 20c6-7 15-8 20-5-4 7-14 9-20 5z" fill={tint} stroke={deep} strokeWidth="1.5" />
        </g>
      );

    // 可可豆莢剖面
    case "cacao":
      return (
        <g>
          <path d="M100 26c19 0 32 16 32 34s-13 32-32 32-32-14-32-32 13-34 32-34z" {...solid} />
          <path d="M100 30v56" stroke={tint} strokeWidth="1.6" fill="none" opacity="0.8" />
          {[
            [88, 48],
            [112, 48],
            [88, 66],
            [112, 66],
            [100, 78],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="7" ry="5.5" fill={tint} stroke={deep} strokeWidth="1.2" />
          ))}
        </g>
      );

    // 堅果：一顆胡桃 + 一顆腰果
    case "nut":
      return (
        <g>
          <path d="M84 38c14-6 27 2 28 17 1 14-10 25-22 24-13-1-21-13-19-25 1-8 6-13 13-16z" {...solid} />
          <path d="M92 42c-4 10-3 24 3 34M100 40c1 12 0 25-3 34" {...line} strokeWidth="1.3" opacity="0.5" />
          <path d="M118 68c10-4 19 2 20 11 1 8-6 14-14 13-8-1-12-8-11-14 1-5 3-8 5-10z" fill={tint} stroke={deep} strokeWidth="1.7" />
        </g>
      );

    // 香料：八角 + 兩根丁香
    case "spice":
      return (
        <g>
          {[0, 45, 90, 135].map((a) => (
            <ellipse
              key={a}
              cx="96"
              cy="58"
              rx="27"
              ry="7.5"
              transform={`rotate(${a} 96 58)`}
              fill={tint}
              stroke={deep}
              strokeWidth="1.5"
            />
          ))}
          <circle cx="96" cy="58" r="6" fill={ink} stroke={deep} strokeWidth="1.5" />
          <g transform="rotate(24 130 44)">
            <circle cx="130" cy="34" r="5.5" fill={ink} stroke={deep} strokeWidth="1.4" />
            <path d="M130 40v16" {...line} strokeWidth="2.2" />
          </g>
        </g>
      );

    // 百合／野薑花：三瓣張開的喇叭形
    case "lily":
      return (
        <g>
          <path d="M100 84c-16-6-27-24-24-42 10 6 20 20 24 42z" fill={tint} stroke={deep} strokeWidth="1.7" />
          <path d="M100 84c16-6 27-24 24-42-10 6-20 20-24 42z" fill={tint} stroke={deep} strokeWidth="1.7" />
          <path d="M100 84c-4-20-4-38 0-52 4 14 4 32 0 52z" fill={ink} stroke={deep} strokeWidth="1.7" />
          <path d="M100 62v22M94 68l6 16M106 68l-6 16" {...line} strokeWidth="1.1" opacity="0.45" />
        </g>
      );

    // 柑橘剖面
    case "citrus":
      return (
        <g>
          <circle cx="100" cy="58" r="30" fill={tint} stroke={deep} strokeWidth="1.9" />
          <circle cx="100" cy="58" r="23" fill="none" stroke={deep} strokeWidth="1.2" opacity="0.6" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d="M100 58 L100 35"
              transform={`rotate(${a} 100 58)`}
              stroke={deep}
              strokeWidth="1.2"
              opacity="0.55"
            />
          ))}
          <circle cx="100" cy="58" r="4.5" fill={ink} />
        </g>
      );

    // 蘭姆酒：小酒瓶與兩顆氣泡
    case "rum":
      return (
        <g>
          <path d="M92 26h16v12l9 12c2 3 3 6 3 9v25c0 4-3 7-7 7H87c-4 0-7-3-7-7V59c0-3 1-6 3-9l9-12V26z" {...solid} />
          <path d="M80 66h40" stroke={tint} strokeWidth="1.5" fill="none" />
          <rect x="86" y="72" width="28" height="15" rx="1" fill={tint} stroke={deep} strokeWidth="1.2" />
          <circle cx="132" cy="40" r="5" fill="none" stroke={deep} strokeWidth="1.5" />
          <circle cx="140" cy="55" r="3" fill="none" stroke={deep} strokeWidth="1.3" />
        </g>
      );

    // 紅茶：一片茶葉與一縷熱氣
    case "tea":
      return (
        <g>
          <path
            d="M100 26c22 10 32 32 26 50-16 8-36-2-44-18-7-14-3-26 18-32z"
            fill={tint}
            stroke={deep}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M84 74c8-16 20-30 40-46" {...line} strokeWidth="1.6" />
          <path d="M92 60l14-4M98 70l16-6M88 50l12-5" {...line} strokeWidth="1.2" opacity="0.55" />
          <path
            d="M128 40c5-6-2-10 2-16"
            fill="none"
            stroke={deep}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.65"
          />
          <ellipse cx="72" cy="80" rx="9" ry="6" fill={ink} stroke={deep} strokeWidth="1.5" transform="rotate(-22 72 80)" />
        </g>
      );

    // 梅：帶溝的圓果與一枝短梗
    case "plum":
      return (
        <g>
          <path d="M98 36c17 0 29 13 29 27 0 15-13 26-29 26s-29-11-29-26c0-14 12-27 29-27z" {...solid} />
          <path d="M98 38c-6 9-7 22-1 26s7 17 1 25" {...line} strokeWidth="1.5" opacity="0.5" />
          <path d="M98 36V22" {...line} strokeWidth="2" />
          <path d="M98 24c8-9 19-9 24-5-5 9-17 12-24 5z" fill={tint} stroke={deep} strokeWidth="1.6" />
          <path d="M104 24c4 1 8 2 12 1" {...line} strokeWidth="1.1" opacity="0.55" />
          <circle cx="128" cy="72" r="3" fill={deep} opacity="0.5" />
        </g>
      );

    // 熱帶水果：鳳梨
    case "tropical":
      return (
        <g>
          {/* 冠葉 */}
          {[-28, -12, 4, 20].map((r, i) => (
            <path
              key={i}
              d="M100 34c-4-12-2-22 2-28 5 7 6 17 2 28z"
              transform={`rotate(${r} 100 34)`}
              fill={tint}
              stroke={deep}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          ))}
          <ellipse cx="100" cy="62" rx="25" ry="30" {...solid} />
          {/* 鱗片的交叉網紋 */}
          <path
            d="M80 46l40 32M80 78l40-32M88 38l26 46M112 38L86 84"
            fill="none"
            stroke={tint}
            strokeWidth="1.2"
            opacity="0.85"
          />
          <ellipse cx="100" cy="62" rx="25" ry="30" fill="none" stroke={deep} strokeWidth="1.8" />
        </g>
      );

    // 方糖／黑糖塊
    case "sugar":
      return (
        <g>
          <path d="M74 52l26-14 26 14-26 14z" fill={tint} stroke={deep} strokeWidth="1.7" />
          <path d="M74 52v18l26 14V66z" fill={ink} stroke={deep} strokeWidth="1.7" />
          <path d="M126 52v18l-26 14V66z" fill={ink} opacity="0.75" stroke={deep} strokeWidth="1.7" />
          <circle cx="132" cy="34" r="3.2" fill={deep} opacity="0.6" />
          <circle cx="70" cy="32" r="2.4" fill={deep} opacity="0.45" />
        </g>
      );
  }
}

export default function BeanArt({
  bean,
  className,
  /** 小尺寸（購物車列）時省略外圈與編號，避免糊成一團 */
  compact = false,
}: {
  bean: Bean;
  className?: string;
  compact?: boolean;
}) {
  const fam = FAMILY[bean.families[0]!];
  const h = hash(bean.slug);
  // 圓的旋轉與豆子的傾角各給一點隨機，讓 15 張並排時不像同一個模子
  const spin = (h % 14) - 7;
  const lean = ((h >> 5) % 10) - 5;
  const tint = `color-mix(in srgb, ${fam.color} 26%, #FFFDF9)`;

  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      role="img"
      aria-label={`${bean.nameZh}的風味插畫`}
      style={{ display: "block" }}
    >
      {!compact && (
        <g transform={`rotate(${spin} 100 106)`}>
          {/* 落款印那樣的外圈。兩道，內圈虛線代表處理法的發酵時間 */}
          <circle cx="100" cy="106" r="86" fill={tint} opacity="0.4" />
          <circle cx="100" cy="106" r="86" fill="none" stroke={fam.colorDeep} strokeWidth="1.1" opacity="0.5" />
          <circle
            cx="100"
            cy="106"
            r="78"
            fill="none"
            stroke={fam.colorDeep}
            strokeWidth="0.9"
            strokeDasharray="2 6"
            opacity="0.35"
          />
        </g>
      )}

      <MotifArt motif={bean.motif} ink={fam.color} deep={fam.colorDeep} tint={tint} />

      {/* 咖啡豆側身。中線那條 S 是這顆豆子的溝 */}
      <g transform={`rotate(${lean} 100 152)`}>
        <ellipse cx="100" cy="152" rx="52" ry="36" fill={fam.colorDeep} />
        <path
          d="M62 152c10-13 20 8 38 8s28-21 38-8"
          fill="none"
          stroke={tint}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M62 152c10 13 20-8 38-8s28 21 38 8"
          fill="none"
          stroke={fam.colorDeep}
          strokeWidth="0.1"
        />
        {/* 左上一道極淡的高光，讓豆子不是一塊平色 */}
        <ellipse cx="82" cy="138" rx="16" ry="9" fill="#FFFDF9" opacity="0.14" transform="rotate(-24 82 138)" />
      </g>

      {!compact && (
        <text
          x="100"
          y="205"
          textAnchor="middle"
          fontFamily="var(--rk-mono)"
          fontSize="10"
          letterSpacing="0.18em"
          fill={fam.colorDeep}
          opacity="0.75"
        >
          NO.{String(bean.no).padStart(2, "0")}
        </text>
      )}
    </svg>
  );
}
