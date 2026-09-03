import { SITE } from "../_data/site";

/**
 * 加 LINE 好友。
 *
 * 為什麼不用 LINE 官方那張圓角綠底的品牌圖：這個站的色票是和紙、墨與深青，
 * 一塊飽和的品牌綠放進去會是整頁最吵的東西。改成站內樣式的按鈕，
 * 只在對話泡泡上留 LINE 綠——辨識度夠，又不會打斷版面。
 */
export function LineGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      <path
        d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.2 7.9.3.07.75.22.86.5.1.26.07.66.03.92l-.14.84c-.04.25-.2.98.86.53s5.7-3.36 7.78-5.75C21 14.3 22 12.8 22 11c0-4.4-4.5-8-10-8z"
        fill="#06C755"
      />
      <path
        d="M9.3 9.1v3.6M9.3 9.1h-1.6v3.6h1.6M11.2 12.7V9.1l2.4 3.6V9.1M15.4 12.7V9.1h1.7M15.4 10.9h1.5M15.4 12.7h1.7"
        stroke="#fff"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function LineButton({
  className = "rk-btn rk-btn--quiet",
  label = "加 LINE 問問題",
  style,
}: {
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      className={className}
      href={SITE.line}
      target="_blank"
      rel="noreferrer noopener"
      style={style}
    >
      <LineGlyph />
      {label}
    </a>
  );
}
