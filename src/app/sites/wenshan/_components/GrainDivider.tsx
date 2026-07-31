// 木紋分隔線：三條細線繞過一個小節疤（年輪 motif 的段落呼應）
export default function GrainDivider({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className="ws-divider"
      viewBox="0 0 1200 56"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M0 22 C 300 20, 520 14, 600 22 C 640 26, 660 34, 700 30 C 760 24, 900 24, 1200 26" />
        <path d="M0 30 C 280 30, 500 26, 585 30 C 630 33, 668 40, 715 36 C 790 30, 940 32, 1200 33" opacity="0.6" />
        <path d="M0 38 C 260 40, 480 36, 570 38 C 625 40, 672 45, 730 42 C 820 38, 960 40, 1200 40" opacity="0.35" />
        <ellipse cx="660" cy="31" rx="14" ry="7" opacity="0.7" />
        <ellipse cx="660" cy="31" rx="7" ry="3.5" opacity="0.7" />
      </g>
    </svg>
  );
}
