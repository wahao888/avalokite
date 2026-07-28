// 型錄分類等角（isometric）SVG 圖示：立體感、零執行成本、與品牌色一致。
// 幾何用共用的 iso box 工具產生，各分類再疊上特徵細節。

const AX = 0.866;
const AY = 0.5;
const BX = -0.866;
const BY = 0.5;

type Pt = [number, number];

const alongA = (p: Pt, n: number): Pt => [p[0] + AX * n, p[1] + AY * n];
const alongB = (p: Pt, n: number): Pt => [p[0] + BX * n, p[1] + BY * n];
const down = (p: Pt, h: number): Pt => [p[0], p[1] + h];
const path = (pts: Pt[]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z`;

const WOOD = { top: "#e6cfa4", right: "#c69a63", left: "#9c7245" };
const GREY = { top: "#eeece6", right: "#cfccc4", left: "#aaa69c" };
const STROKE = "#58381e";

function faces(p0: Pt, w: number, d: number, h: number) {
  const t0 = p0;
  const t1 = alongA(p0, w);
  const t2 = alongB(t1, d);
  const t3 = alongB(p0, d);
  return { t0, t1, t2, t3 };
}

interface BoxProps {
  p: Pt;
  w: number;
  d: number;
  h: number;
  c?: { top: string; right: string; left: string };
  children?: React.ReactNode;
}

function IsoBox({ p, w, d, h, c = WOOD, children }: BoxProps) {
  const { t0, t1, t2, t3 } = faces(p, w, d, h);
  return (
    <g stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round">
      <path d={path([t1, t2, down(t2, h), down(t1, h)])} fill={c.right} />
      <path d={path([t3, t2, down(t2, h), down(t3, h)])} fill={c.left} />
      <path d={path([t0, t1, t2, t3])} fill={c.top} />
      {children}
    </g>
  );
}

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className="ws-caticon" aria-hidden="true">
      {children}
    </svg>
  );
}

// 結構角材：三支角材疊成束
function Lumber() {
  return (
    <Svg>
      <IsoBox p={[15, 30]} w={38} d={8} h={8} />
      <IsoBox p={[8, 34]} w={38} d={8} h={8} />
      <IsoBox p={[11, 24]} w={38} d={8} h={8} c={{ top: "#eedbb4", right: "#c69a63", left: "#9c7245" }} />
    </Svg>
  );
}

// 夾板：三片薄板疊放，側邊有夾層線
function Plywood() {
  const boards: Pt[] = [
    [14, 30],
    [15, 23],
    [13, 16],
  ];
  return (
    <Svg>
      {boards.map((p, i) => {
        const { t1, t2 } = faces(p, 34, 24, 4);
        return (
          <g key={i}>
            <IsoBox p={p} w={34} d={24} h={4} />
            <path
              d={`M${t1[0]} ${t1[1] + 2} L${t2[0]} ${t2[1] + 2}`}
              stroke="#f0e2c2"
              strokeWidth="0.9"
              fill="none"
            />
          </g>
        );
      })}
    </Svg>
  );
}

// 木心板：厚板，側邊露出芯條
function Blockboard() {
  const p: Pt = [14, 22];
  const { t1 } = faces(p, 34, 24, 12);
  const strips = [4, 8, 12, 16, 20].map((k) => alongB(t1, k));
  return (
    <Svg>
      <IsoBox p={p} w={34} d={24} h={12}>
        {strips.map((s, i) => (
          <path key={i} d={`M${s[0]} ${s[1]} L${s[0]} ${s[1] + 12}`} stroke="#8a5c34" strokeWidth="1" fill="none" />
        ))}
      </IsoBox>
    </Svg>
  );
}

// OSB：板面撒木片
function Osb() {
  const p: Pt = [13, 24];
  const flakes = [
    [24, 24, -18],
    [32, 28, 24],
    [22, 32, 8],
    [36, 22, -30],
    [30, 36, -12],
    [40, 30, 16],
    [18, 28, 30],
    [38, 36, -22],
  ] as const;
  return (
    <Svg>
      <IsoBox p={p} w={38} d={26} h={5}>
        {flakes.map(([x, y, r], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="7"
            height="3"
            rx="1"
            transform={`rotate(${r} ${x} ${y})`}
            fill={i % 2 ? "#c69a63" : "#a97c4f"}
            stroke="none"
            opacity="0.85"
          />
        ))}
      </IsoBox>
    </Svg>
  );
}

// MDF：兩片平滑素面板
function Mdf() {
  return (
    <Svg>
      <IsoBox p={[14, 30]} w={36} d={26} h={5} c={{ top: "#e2cda2", right: "#cba76f", left: "#a9814f" }} />
      <IsoBox p={[16, 20]} w={32} d={22} h={5} c={{ top: "#e9d6ac", right: "#d0ad76", left: "#ad8654" }} />
    </Svg>
  );
}

// 實木拼板：板面有拼接縫
function SolidPanel() {
  const p: Pt = [13, 22];
  const seams = [6.5, 13, 19.5].map((k) => [alongB(p, k), alongB(alongA(p, 38), k)] as [Pt, Pt]);
  return (
    <Svg>
      <IsoBox p={p} w={38} d={26} h={6}>
        {seams.map(([a, b], i) => (
          <path key={i} d={`M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`} stroke="#a5734a" strokeWidth="1" fill="none" />
        ))}
      </IsoBox>
    </Svg>
  );
}

// 裝修實木板料：企口板牆
function DecoWood() {
  return (
    <Svg>
      <IsoBox p={[16, 14]} w={9} d={8} h={32} />
      <IsoBox p={alongA([16, 14], 10.5)} w={9} d={8} h={32} c={{ top: "#eedbb4", right: "#cba76f", left: "#9c7245" }} />
      <IsoBox p={alongA([16, 14], 21)} w={9} d={8} h={32} />
    </Svg>
  );
}

// 南方松戶外材：甲板＋短柱
function Outdoor() {
  const base: Pt = [17, 18];
  return (
    <Svg>
      <IsoBox p={down(alongB(base, 6), 26)} w={7} d={7} h={9} c={{ top: "#c69a63", right: "#a97c4f", left: "#8a5c34" }} />
      <IsoBox p={down(alongB(alongA(base, 30), 6), 26)} w={7} d={7} h={9} c={{ top: "#c69a63", right: "#a97c4f", left: "#8a5c34" }} />
      {[0, 7.5, 15, 22.5].map((k) => (
        <IsoBox key={k} p={alongB(base, k)} w={38} d={5.5} h={4} />
      ))}
    </Svg>
  );
}

// 線板／圓棒：圓木棒＋半圓線板
function Moulding() {
  return (
    <Svg>
      <g stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round">
        {/* 圓棒 */}
        <path d="M20 16 L20 46 A6 3 0 0 0 32 46 L32 16" fill="#c69a63" />
        <ellipse cx="26" cy="16" rx="6" ry="3" fill="#e6cfa4" />
        {/* 半圓線板（前端剖面） */}
        <path d="M38 44 L54 36 L54 30 A6 5 0 0 0 42 36 L38 38 Z" fill="#9c7245" />
        <path d="M38 38 L42 36 A6 5 0 0 1 54 30 L54 28 A8 6 0 0 0 38 36 Z" fill="#e6cfa4" />
      </g>
    </Svg>
  );
}

// 裝修配套板材：灰白色板疊（矽酸鈣板）
function BoardMisc() {
  return (
    <Svg>
      <IsoBox p={[14, 32]} w={36} d={26} h={4} c={GREY} />
      <IsoBox p={[15, 25]} w={34} d={24} h={4} c={GREY} />
      <IsoBox p={[13, 18]} w={36} d={26} h={4} c={{ top: "#f4f2ec", right: "#d8d5cd", left: "#b4b0a6" }} />
    </Svg>
  );
}

// 耗材五金：白膠瓶＋螺絲
function Hardware() {
  return (
    <Svg>
      <g stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        <rect x="14" y="22" width="17" height="26" rx="4" fill="#e6cfa4" />
        <rect x="19" y="16" width="7" height="6" rx="1.5" fill="#c69a63" />
        <path d="M22.5 16 L22.5 10" />
        <path d="M17 32 L28 32 M17 37 L28 37" stroke="#a5734a" strokeWidth="1" />
        {[40, 50].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={24 + i * 4} r="3.4" fill="#c9c5bb" />
            <path d={`M${x - 2} ${24 + i * 4} L${x + 2} ${24 + i * 4}`} strokeWidth="1" />
            <path d={`M${x} ${27.5 + i * 4} L${x} ${43 + i * 4}`} />
            {[31, 35, 39].map((y) => (
              <path key={y} d={`M${x - 2.2} ${y + i * 4} L${x + 2.2} ${y + i * 4 - 2}`} strokeWidth="1" />
            ))}
          </g>
        ))}
      </g>
    </Svg>
  );
}

// 裁切與加工：板料＋虛線切線＋圓鋸片
function Service() {
  const p: Pt = [13, 30];
  const cutA = alongA(p, 19);
  const cutB = alongB(cutA, 24);
  return (
    <Svg>
      <IsoBox p={p} w={38} d={24} h={5}>
        <path
          d={`M${cutA[0].toFixed(1)} ${cutA[1].toFixed(1)} L${cutB[0].toFixed(1)} ${cutB[1].toFixed(1)}`}
          stroke={STROKE}
          strokeWidth="1.2"
          strokeDasharray="3 2.6"
          fill="none"
        />
      </IsoBox>
      <g stroke={STROKE} strokeWidth="1.3">
        <circle cx="35" cy="18" r="9.5" fill="#d8d5cd" />
        <circle cx="35" cy="18" r="2.2" fill="#8a8074" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x1 = 35 + Math.cos(a) * 9.5;
          const y1 = 18 + Math.sin(a) * 9.5;
          const x2 = 35 + Math.cos(a + 0.28) * 12;
          const y2 = 18 + Math.sin(a + 0.28) * 12;
          return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
        })}
      </g>
    </Svg>
  );
}

const ICONS: Record<string, () => React.ReactNode> = {
  lumber: Lumber,
  plywood: Plywood,
  blockboard: Blockboard,
  osb: Osb,
  mdf: Mdf,
  "solid-panel": SolidPanel,
  "deco-wood": DecoWood,
  outdoor: Outdoor,
  moulding: Moulding,
  "board-misc": BoardMisc,
  hardware: Hardware,
  service: Service,
};

export default function CatalogIcon({ id }: { id: string }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <>{Icon()}</>;
}
