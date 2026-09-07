// AmberPick 的識別。
//
// 概念：琥珀（Amber）是一顆被光穿過的寶石，Pick 是「從一堆東西裡挑中的那一個」。
// 所以標誌是一顆細線的菱形寶石，中心一個實心的點——那個點就是被挑中的那一件。
//
// 為什麼用 SVG 而不是圖檔：
//   ・任何尺寸都清楚（favicon 16px 到 OG 圖 1200px）
//   ・跟著文字顏色走，深淺模式自動對
//   ・零額外請求。客人是從 LINE 冷啟動進來的，每一個請求都在跟首屏搶時間
//
// 日雜清爽的取捨：線細（1.6/24）、留白多、不加陰影漸層。
// 小尺寸時線會太細，所以 mark 提供 stroke 參數讓 favicon 加粗。

export function AmberMark({
  size = 24,
  stroke = 1.6,
  className,
}: {
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* 菱形寶石。用旋轉 45 度的圓角方形畫，圓角讓它像被打磨過而不是尖銳的鑽石 */}
      <rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="3.2"
        transform="rotate(45 12 12)"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {/* 被挑中的那一個 */}
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

/**
 * 字標。
 *
 * 「Amber」用中等字重、「Pick」用細字重加字距——兩個字在視覺上分開，
 * 但不靠顏色分（顏色留給價格與倒數那些真正需要被看見的東西）。
 */
export function AmberWordmark({ className }: { className?: string }) {
  return (
    <span className={className ?? "am-logo"}>
      <AmberMark size={22} className="am-logo__mark" />
      <span className="am-logo__text">
        <b>Amber</b>
        <i>Pick</i>
      </span>
    </span>
  );
}
