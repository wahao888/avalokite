import { DOODLES, KINDS, type DoodleName } from "@/lib/doodle";

export type { DoodleName };

/**
 * 手繪圖示與插圖。圖形由 src/lib/doodle.ts 用程式算出來，這裡只負責輸出 SVG。
 * 純裝飾，一律 aria-hidden；旁邊一定要有文字說明同一件事。
 *
 * size 有給＝固定寬度的小圖示；不給＝由 CSS 決定大小（大插圖、標題底線）。
 * stretch 讓圖形不等比拉伸到容器大小，只給標題底線那種橫線用。
 */
export default function Doodle({
  name,
  size,
  className,
  stretch,
}: {
  name: DoodleName;
  size?: number;
  className?: string;
  stretch?: boolean;
}) {
  const art = DOODLES[name];
  return (
    <svg
      className={className ? `doodle ${className}` : "doodle"}
      viewBox={`0 0 ${art.w} ${art.h}`}
      width={size}
      height={size ? Math.round((size * art.h) / art.w) : undefined}
      preserveAspectRatio={stretch ? "none" : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {KINDS.map((k) => (art.parts[k] ? <path key={k} className={`dd-${k}`} d={art.parts[k]} /> : null))}
    </svg>
  );
}
