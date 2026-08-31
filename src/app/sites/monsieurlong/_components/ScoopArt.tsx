import type { Flavor, Motif } from "../_data/flavors";

/* ═══════════════════════════════════════════════════════════════
   口味插畫產生器

   為什麼是程式畫的 SVG，而不是 16 張圖檔：
   ① 新增口味只要填一個 hex 與一個 motif，插畫自動成立——這正是
      「口味常常新增刪除」需要的維護成本。
   ② 向量、無網路請求、任何尺寸都銳利，行動版不吃頻寬。
   ③ 伺服器 CSP 是 img-src 'self'，本來就不能外連圖床。
   店家提供實拍照後，可在 Flavor 加 image 欄位並在卡片優先顯示照片，
   插畫退居 placeholder，兩者共存不衝突。
   ═══════════════════════════════════════════════════════════════ */

/** 由 slug 決定杯型與擺放，同一個口味永遠長一樣，但彼此不重複 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const MOUNDS = [
  // 高聳漩渦
  "M44,120 C42,76 60,38 100,38 C140,38 158,76 156,120 Z",
  // 雙丘
  "M42,120 C38,88 56,62 80,66 C90,44 118,42 130,64 C156,62 168,90 158,120 Z",
  // 抹刀壓出來的義式扁丘
  "M40,120 C40,88 58,54 100,48 C144,42 162,84 160,120 Z",
];

const RIDGES = [
  "M62,108 C70,80 84,58 100,52",
  "M70,112 C72,90 84,74 98,70",
  "M56,110 C74,84 100,68 130,66",
];

function Motifs({ motif, ink, deep }: { motif: Motif; ink: string; deep: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 2.4, strokeLinecap: "round" as const };

  switch (motif) {
    case "salt":
      return (
        <g>
          {[
            [86, 56],
            [104, 46],
            [116, 62],
          ].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x},${y - 5} L${x + 4.5},${y} L${x},${y + 5} L${x - 4.5},${y} Z`}
              fill="#FFFDF7"
              stroke={ink}
              strokeWidth="1.8"
            />
          ))}
        </g>
      );

    case "sesame":
      return (
        <g fill={ink}>
          {[
            [80, 62, -18],
            [96, 50, 24],
            [110, 64, -8],
            [92, 72, 40],
            [116, 50, 12],
          ].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="4.6" ry="2.9" transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      );

    case "cocoa":
      return (
        <g>
          <path
            d="M84,66 L104,42 L118,50 L98,74 Z"
            fill={deep}
            stroke={ink}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M90,60 L106,52" {...line} strokeWidth="1.6" opacity="0.55" />
        </g>
      );

    case "citrus":
      return (
        <g>
          <path d="M78,64 A24,24 0 0 1 126,64 Z" fill="#FFFDF7" stroke={ink} strokeWidth="2.2" />
          <path d="M102,64 L102,42 M102,64 L84,50 M102,64 L120,50" {...line} strokeWidth="1.7" />
          <path d="M78,64 A24,24 0 0 1 126,64" fill="none" stroke={ink} strokeWidth="2.4" />
        </g>
      );

    case "peanut":
      return (
        <g>
          <path
            d="M82,64 C74,58 76,46 86,44 C92,34 108,34 112,44 C124,46 126,60 116,66 C108,72 90,72 82,64 Z"
            fill="#FFFDF7"
            stroke={ink}
            strokeWidth="2.2"
          />
          <path d="M98,42 C94,50 96,58 100,66" {...line} strokeWidth="1.5" opacity="0.7" />
        </g>
      );

    case "pistachio":
      return (
        <g>
          <path
            d="M84,68 C78,54 88,40 102,40 C118,40 126,54 118,68 Z"
            fill={deep}
            stroke={ink}
            strokeWidth="2.2"
          />
          <path d="M84,68 L118,68" {...line} strokeWidth="2.4" />
          <path d="M100,44 L100,64" {...line} strokeWidth="1.5" opacity="0.6" />
        </g>
      );

    case "berry":
      return (
        <g>
          <circle cx="100" cy="58" r="17" fill={deep} stroke={ink} strokeWidth="2.2" />
          {[
            [94, 52],
            [106, 54],
            [98, 64],
            [108, 64],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill="#FFFDF7" opacity="0.75" />
          ))}
          <path d="M100,41 C98,33 104,28 110,29" {...line} />
        </g>
      );

    case "leaf":
      return (
        <g>
          <path
            d="M84,70 C82,48 98,36 118,38 C120,58 106,72 84,70 Z"
            fill={deep}
            stroke={ink}
            strokeWidth="2.2"
          />
          <path d="M86,68 C96,58 108,48 117,40" {...line} strokeWidth="1.6" />
        </g>
      );

    case "bean":
      return (
        <g>
          <ellipse
            cx="100"
            cy="56"
            rx="13"
            ry="18"
            transform="rotate(-22 100 56)"
            fill={deep}
            stroke={ink}
            strokeWidth="2.2"
          />
          <path d="M92,44 C100,52 100,62 94,70" {...line} strokeWidth="1.8" />
        </g>
      );

    case "vanilla":
      return (
        <g>
          <path
            d="M80,72 C88,50 104,36 122,32"
            fill="none"
            stroke={ink}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M80,72 C88,50 104,36 122,32"
            fill="none"
            stroke={deep}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g fill={ink}>
            {[
              [92, 68],
              [104, 60],
              [86, 76],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.7" />
            ))}
          </g>
        </g>
      );

    case "sun":
      return (
        <g>
          <circle cx="100" cy="56" r="12" fill="#FFFDF7" stroke={ink} strokeWidth="2.2" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 100 + Math.cos(a) * 17;
            const y1 = 56 + Math.sin(a) * 17;
            const x2 = 100 + Math.cos(a) * 23;
            const y2 = 56 + Math.sin(a) * 23;
            return <path key={i} d={`M${x1},${y1} L${x2},${y2}`} {...line} strokeWidth="2" />;
          })}
        </g>
      );

    case "longan":
      // 龍眼＝「龍的眼睛」。剖面就是這個樣子：褐殼、白肉、黑籽。
      return (
        <g>
          <circle cx="100" cy="58" r="18" fill={deep} stroke={ink} strokeWidth="2.2" />
          <circle cx="100" cy="58" r="11.5" fill="#FFFDF7" stroke={ink} strokeWidth="1.6" />
          <circle cx="100" cy="58" r="5" fill={ink} />
          <path d="M100,40 C99,33 104,29 110,30" {...line} />
        </g>
      );

    case "lychee":
      return (
        <g>
          <circle cx="100" cy="58" r="17" fill={deep} stroke={ink} strokeWidth="2.2" />
          {[
            [93, 51],
            [104, 50],
            [109, 60],
            [95, 63],
            [102, 68],
          ].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x - 3},${y} L${x},${y - 3} L${x + 3},${y} L${x},${y + 3} Z`}
              fill="#FFFDF7"
              opacity="0.6"
            />
          ))}
          <path d="M100,41 C99,34 104,30 110,31" {...line} />
        </g>
      );
  }
}

export default function ScoopArt({
  flavor,
  className,
  title,
}: {
  flavor: Pick<Flavor, "slug" | "color" | "colorDeep" | "motif" | "nameZh">;
  className?: string;
  /** 有意義時傳入，會變成無障礙標題；純裝飾就別傳 */
  title?: string;
}) {
  const ink = "#16130F";
  const h = hash(flavor.slug);
  const variant = h % MOUNDS.length;
  const id = `ml-scoop-${flavor.slug}`;
  const tilt = ((h >> 3) % 5) - 2; // -2°〜+2°，讓一整排卡片不像複製貼上

  return (
    <svg
      viewBox="0 0 200 224"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={`${id}-mound`}>
          <path d={MOUNDS[variant]} />
        </clipPath>
      </defs>

      <g transform={`rotate(${tilt} 100 130)`}>
        {/* ── 紙杯 ─────────────────────────── */}
        <path
          d="M38,128 L61,204 Q63,211 70,211 L130,211 Q137,211 139,204 L162,128 Z"
          fill="#FFFDF7"
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* 杯身上的品牌色腰帶 */}
        <path
          d="M47,158 L153,158 L147,178 L53,178 Z"
          fill="#FFC732"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="168" r="4.6" fill={ink} />
        {/* 杯緣 */}
        <rect
          x="29"
          y="112"
          width="142"
          height="17"
          rx="8.5"
          fill="#FFFDF7"
          stroke={ink}
          strokeWidth="3"
        />

        {/* ── 融化的那一滴，掛在杯緣上 ────────── */}
        <path
          d="M52,127 C48,140 47,152 52,158 a7,7 0 1 0 11,-1 c-4,-8 -4,-20 -2,-30 Z"
          fill={flavor.color}
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />

        {/* ── 冰淇淋本體 ──────────────────── */}
        <g>
          <path d={MOUNDS[variant]} fill={flavor.color} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <g clipPath={`url(#${id}-mound)`}>
            {/* 右下陰影 */}
            <path
              d="M104,34 C150,44 178,86 172,132 L104,132 Z"
              fill={flavor.colorDeep}
              opacity="0.34"
            />
            {/* 左上高光 */}
            <path d="M62,110 C58,78 74,50 96,44" fill="none" stroke="#FFFDF7" strokeWidth="7" opacity="0.5" strokeLinecap="round" />
            {/* 抹刀壓出的紋路 */}
            <path d={RIDGES[variant]} fill="none" stroke={ink} strokeWidth="1.8" opacity="0.24" strokeLinecap="round" />
          </g>
          <Motifs motif={flavor.motif} ink={ink} deep={flavor.colorDeep} />
        </g>
      </g>
    </svg>
  );
}

/** 只有冰淇淋、沒有杯子的版本：用在小圖示與社群圖磚 */
export function ScoopMark({
  color,
  colorDeep,
  slug,
  className,
}: {
  color: string;
  colorDeep: string;
  slug: string;
  className?: string;
}) {
  const ink = "#16130F";
  const variant = hash(slug) % MOUNDS.length;
  const id = `ml-mark-${slug}`;
  return (
    <svg viewBox="30 30 140 100" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-c`}>
          <path d={MOUNDS[variant]} />
        </clipPath>
      </defs>
      <path d={MOUNDS[variant]} fill={color} stroke={ink} strokeWidth="3.4" strokeLinejoin="round" />
      <g clipPath={`url(#${id}-c)`}>
        <path d="M104,34 C150,44 178,86 172,132 L104,132 Z" fill={colorDeep} opacity="0.32" />
      </g>
    </svg>
  );
}
