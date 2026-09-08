// 首頁 hero 的手繪插畫。
//
// 為什麼是插畫不是照片：這一站沒有自己的攝影素材，而商品照是客戶用手機
// 在店裡拍的——放大當主視覺會立刻露出畫質。線稿插畫在任何尺寸都清楚、
// 沒有版權問題、深淺模式自動跟著字色走，而且檔案小到不佔首屏。
//
// 畫的是這門生意本身：一趟飛過來的行程、一個包裹、一張價格標。
// 筆觸與 Logo.tsx、Icons.tsx 同一組參數（stroke 1.6～2、圓端點），
// 所以它跟頁面上其他圖示看起來是同一支筆畫的。
//
// ⚠ 只在桌機顯示（見 amber.css 的 .am-hero）。手機版首頁的工作是
// 「立刻看到這一檔有什麼」，一張 300px 高的插畫會把商品推到摺線下面。

/** 四角星芒。用貝茲曲線讓筆畫有粗細變化，比等腰四角形柔和。 */
function Spark({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const i = r * 0.16;
  const d = [
    `M${cx} ${cy - r}`,
    `C${cx} ${cy - i} ${cx + i} ${cy} ${cx + r} ${cy}`,
    `C${cx + i} ${cy} ${cx} ${cy + i} ${cx} ${cy + r}`,
    `C${cx} ${cy + i} ${cx - i} ${cy} ${cx - r} ${cy}`,
    `C${cx - i} ${cy} ${cx} ${cy - i} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");
  return <path d={d} />;
}

export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      className={className ?? "am-hero__art"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {/* 底色圓。唯一的填色，讓插畫在大片留白裡有個重心 */}
      <circle cx="236" cy="140" r="116" fill="var(--a-accent-soft)" stroke="none" />

      {/* 航線。虛線＝「還在路上」，這是預購制最核心的一件事 */}
      <g className="am-hero__art-accent">
        <path d="M14 128C70 34 264 16 362 68" strokeDasharray="2 10" strokeWidth="1.6" />
        <g transform="translate(346 44) rotate(26) scale(1.15)">
          <path d="M21.5 3.5 2.8 10.6l7.3 2.9 2.9 7.3z" />
          <path d="M21.5 3.5 10.1 13.5" />
        </g>
      </g>

      {/* 地面。一條線就夠了，畫檯面反而會搶戲 */}
      <path d="M34 248h352" className="am-hero__art-faint" />

      {/* 包裹。3/4 視角，主角 */}
      <path d="M158 168h120v80H158z" />
      <path d="M158 168l24-20h120l-24 20z" />
      <path d="M278 168l24-20v80l-24 20z" />
      <path d="M218 168v80" className="am-hero__art-faint" />
      <path d="M218 168l24-20" className="am-hero__art-faint" />

      {/* 購物袋。袋身上是 AmberPick 的菱形記號 */}
      <path d="M54 192h80l-6 56H60z" />
      <path d="M78 192v-8a17 17 0 0 1 34 0v8" />
      <g className="am-hero__art-accent">
        <rect
          x="88"
          y="212"
          width="13"
          height="13"
          rx="3.2"
          transform="rotate(45 94.5 218.5)"
          strokeWidth="1.5"
        />
        <circle cx="94.5" cy="218.5" r="2.3" fill="currentColor" stroke="none" />
      </g>

      {/* 瓶罐。點出「美妝也代購」，不用寫字 */}
      <path d="M332 248v-44l8-10v-8h14v8l8 10v44z" />
      <path d="M340 194h14" className="am-hero__art-faint" />
      <path d="M332 218h30" className="am-hero__art-faint" />

      {/* 價格標。掛在包裹上——「價格上架時就標好了」是她的規則 */}
      <g className="am-hero__art-accent">
        <path d="M308 122c-2 12-6 19-11 25" strokeWidth="1.5" />
        <path d="M312 76h30a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6h-30l-14-17z" />
        <circle cx="309" cy="93" r="3.4" strokeWidth="1.5" />
      </g>

      {/* 星芒。三顆，大小不一，不對稱擺——對稱會變成圖案而不是插畫 */}
      <g className="am-hero__art-accent" strokeWidth="1.5">
        <Spark cx={96} cy={112} r={13} />
        <Spark cx={378} cy={152} r={9} />
        <Spark cx={146} cy={70} r={7} />
      </g>
    </svg>
  );
}
