// 師傅設施（施工場地／工具寄放）等角插畫
import { IsoBox, Svg, STROKE, GREY, alongA, alongB } from "./CatalogIcon";

// 施工場地：工作檯＋鋸台上的板料
function Workspace() {
  return (
    <Svg>
      {/* 地面範圍 */}
      <IsoBox p={[8, 40]} w={46} d={30} h={2} c={{ top: "#efe7d6", right: "#d8ceb8", left: "#bdb29a" }} />
      {/* 工作檯 */}
      <IsoBox p={[14, 26]} w={34} d={20} h={4} c={{ top: "#e6cfa4", right: "#c69a63", left: "#9c7245" }} />
      {/* 檯腳 */}
      <IsoBox p={[16, 32]} w={4} d={4} h={12} c={{ top: "#a97c4f", right: "#8a5c34", left: "#70491f" }} />
      <IsoBox p={alongA([16, 32], 26)} w={4} d={4} h={12} c={{ top: "#a97c4f", right: "#8a5c34", left: "#70491f" }} />
      {/* 檯面上的料與夾具 */}
      <IsoBox p={[20, 20]} w={22} d={5} h={3} c={{ top: "#eedbb4", right: "#cba76f", left: "#a9814f" }} />
      <g stroke={STROKE} strokeWidth="1.3" fill="none">
        <path d="M40 22 L47 18" strokeLinecap="round" />
        <circle cx="48.5" cy="17" r="2.2" fill="#d8d5cd" />
      </g>
    </Svg>
  );
}

// 工具寄放：置物櫃／架上的工具箱
function Storage() {
  return (
    <Svg>
      {/* 兩層架 */}
      <IsoBox p={[12, 36]} w={38} d={22} h={3} c={GREY} />
      <IsoBox p={[12, 20]} w={38} d={22} h={3} c={GREY} />
      {/* 立柱 */}
      <IsoBox p={[12, 22]} w={3} d={3} h={20} c={{ top: "#cfccc4", right: "#aaa69c", left: "#8e8a80" }} />
      <IsoBox p={alongA([12, 22], 35)} w={3} d={3} h={20} c={{ top: "#cfccc4", right: "#aaa69c", left: "#8e8a80" }} />
      {/* 上層工具箱 */}
      <IsoBox p={[17, 12]} w={14} d={9} h={7} c={{ top: "#d98f4c", right: "#b56f34", left: "#94551f" }}>
        <path d="M25 12.5 L31 15.5" stroke={STROKE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </IsoBox>
      {/* 下層木料與桶 */}
      <IsoBox p={[16, 30]} w={16} d={6} h={4} c={{ top: "#e6cfa4", right: "#c69a63", left: "#9c7245" }} />
      <IsoBox p={alongB([34, 28], 4)} w={9} d={9} h={8} c={{ top: "#bdb29a", right: "#9d9280", left: "#7f7566" }} />
    </Svg>
  );
}

const ICONS: Record<string, () => React.ReactNode> = {
  workspace: Workspace,
  storage: Storage,
};

export default function FacilityIcon({ id }: { id: string }) {
  const Icon = ICONS[id];
  if (!Icon) return null;
  return <>{Icon()}</>;
}
