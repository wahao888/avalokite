// 場域快選 chips 的小圖示（線條風格，與品牌描邊色一致）
const S = "#58381e";

const ICONS: Record<string, React.ReactNode> = {
  home: (
    // 住家：斜屋頂小屋
    <g>
      <path d="M3 10 L11 3.5 L19 10" />
      <path d="M5.5 9 L5.5 18 L16.5 18 L16.5 9" />
      <rect x="9.5" y="12.5" width="3" height="5.5" />
    </g>
  ),
  shop: (
    // 店面：遮雨棚門面
    <g>
      <path d="M3.5 8 L4.5 4 L17.5 4 L18.5 8" />
      <path d="M3.5 8 Q5 10.5 6.5 8 Q8 10.5 9.5 8 Q11 10.5 12.5 8 Q14 10.5 15.5 8 Q17 10.5 18.5 8" />
      <path d="M5 10.5 L5 18 L17 18 L17 10.5" />
      <rect x="12" y="12.5" width="3.4" height="5.5" />
    </g>
  ),
  office: (
    // 辦公室：大樓
    <g>
      <rect x="5.5" y="3.5" width="11" height="14.5" />
      <path d="M8.5 7 L10 7 M12 7 L13.5 7 M8.5 10.5 L10 10.5 M12 10.5 L13.5 10.5 M8.5 14 L10 14 M12 14 L13.5 14" />
    </g>
  ),
  factory: (
    // 工廠：鋸齒屋頂
    <g>
      <path d="M3.5 18 L3.5 10 L8 7 L8 10 L12.5 7 L12.5 10 L17 7 L17 18 Z" />
      <path d="M6 13.5 L8.5 13.5 M11 13.5 L13.5 13.5" />
    </g>
  ),
  site: (
    // 工地結構：吊掛的 H 樑
    <g>
      <path d="M3 4 L15 4 L15 7" />
      <path d="M15 7 L15 10" strokeDasharray="1.6 1.6" />
      <path d="M10 13 L20 13 M10 17.5 L20 17.5 M15 13 L15 17.5" />
      <path d="M3 4 L3 19" />
    </g>
  ),
  outdoor: (
    // 戶外景觀：小樹＋圍籬
    <g>
      <path d="M7 18 L7 12 M4.5 12.5 Q7 5 9.5 12.5 Z" />
      <path d="M12.5 14 L19 14 M13.5 12 L13.5 18 M17.5 12 L17.5 18" />
    </g>
  ),
};

export default function VenueIcon({ id }: { id: string }) {
  const icon = ICONS[id];
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 22 22"
      className="ws-venue-ico"
      aria-hidden="true"
      fill="none"
      stroke={S}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon}
    </svg>
  );
}
