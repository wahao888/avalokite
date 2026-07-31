// 首頁「服務」四卡的等角插畫，與型錄圖示同一套 iso 幾何語彙
import { IsoBox, Svg, faces, alongB, down, STROKE, GREY, type Pt } from "./CatalogIcon";

// 木料零售批發：板材疊＋一支角材斜靠
function Retail() {
  return (
    <Svg>
      <IsoBox p={[13, 32]} w={38} d={26} h={5} />
      <IsoBox p={[15, 25]} w={34} d={22} h={5} c={{ top: "#eedbb4", right: "#cba76f", left: "#a9814f" }} />
      <IsoBox p={[22, 12]} w={30} d={6} h={6} c={{ top: "#c69a63", right: "#a97c4f", left: "#8a5c34" }} />
    </Svg>
  );
}

// 代客裁切加工：板料＋圓鋸片＋切線
function Cutting() {
  const p: Pt = [12, 30];
  const cutA: Pt = [p[0] + 0.866 * 20, p[1] + 0.5 * 20];
  const cutB = alongB(cutA, 24);
  return (
    <Svg>
      <IsoBox p={p} w={40} d={24} h={5}>
        <path
          d={`M${cutA[0].toFixed(1)} ${cutA[1].toFixed(1)} L${cutB[0].toFixed(1)} ${cutB[1].toFixed(1)}`}
          stroke={STROKE}
          strokeWidth="1.2"
          strokeDasharray="3 2.6"
          fill="none"
        />
      </IsoBox>
      <g stroke={STROKE} strokeWidth="1.3">
        <circle cx="36" cy="17" r="10" fill="#d8d5cd" />
        <circle cx="36" cy="17" r="2.4" fill="#8a8074" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x1 = 36 + Math.cos(a) * 10;
          const y1 = 17 + Math.sin(a) * 10;
          const x2 = 36 + Math.cos(a + 0.28) * 12.6;
          const y2 = 17 + Math.sin(a + 0.28) * 12.6;
          return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
        })}
      </g>
    </Svg>
  );
}

// 工地配送到點：等角小貨車載著木料
function Delivery() {
  const bed: Pt = [10, 26];
  const { t1 } = faces(bed, 26, 14, 12);
  return (
    <Svg>
      {/* 貨斗與車頭 */}
      <IsoBox p={bed} w={26} d={14} h={12} c={GREY} />
      <IsoBox p={alongB([t1[0], t1[1]], 0)} w={10} d={14} h={7} c={{ top: "#e0ddd5", right: "#bab6ac", left: "#98948a" }} />
      <IsoBox p={down(alongB([t1[0], t1[1]], 0), 7)} w={10} d={14} h={5} c={GREY} />
      {/* 載的木料 */}
      <IsoBox p={[14, 20]} w={20} d={5} h={4} />
      <IsoBox p={alongB([14, 20], 6)} w={20} d={5} h={4} c={{ top: "#c69a63", right: "#a97c4f", left: "#8a5c34" }} />
      {/* 輪子 */}
      <g stroke={STROKE} strokeWidth="1.3">
        <ellipse cx="17" cy="52" rx="4.4" ry="4" fill="#4a3a2a" />
        <ellipse cx="17" cy="52" rx="1.6" ry="1.4" fill="#d8d5cd" />
        <ellipse cx="41" cy="55" rx="4.4" ry="4" fill="#4a3a2a" />
        <ellipse cx="41" cy="55" rx="1.6" ry="1.4" fill="#d8d5cd" />
      </g>
    </Svg>
  );
}

// 選料諮詢：放大鏡下的年輪
function Consult() {
  return (
    <Svg>
      <g stroke={STROKE} strokeWidth="1.4" fill="none">
        <circle cx="28" cy="26" r="15" fill="#e6cfa4" />
        <circle cx="28" cy="26" r="10.5" stroke="#a5734a" strokeWidth="1.1" />
        <circle cx="28" cy="26" r="6" stroke="#a5734a" strokeWidth="1.1" />
        <circle cx="28" cy="26" r="2" fill="#8a5c34" stroke="none" />
        {/* 放大鏡 */}
        <circle cx="36" cy="33" r="11" stroke={STROKE} strokeWidth="2" fill="rgba(255,250,238,0.35)" />
        <path d="M44 41 L53 50" strokeWidth="4" strokeLinecap="round" />
      </g>
    </Svg>
  );
}

const ICONS: Record<string, () => React.ReactNode> = {
  retail: Retail,
  cutting: Cutting,
  delivery: Delivery,
  consult: Consult,
};

export default function ServiceIcon({ id }: { id: string }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <>{Icon()}</>;
}
