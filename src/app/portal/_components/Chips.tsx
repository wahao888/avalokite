"use client";

// 晶片列。規格快捷鍵、分類選擇、常用值都用它。
//
// 橫向捲動而不是換行：換行會把置底的送出鈕一路推出螢幕，
// 而她在手機上最需要的就是「主要按鈕永遠在拇指下面」。

export function Chips({
  items,
  selected,
  onPick,
  ariaLabel,
}: {
  items: { key: string; label: string }[];
  /** 單選時傳字串；純快捷鍵（無選中狀態）時傳 null */
  selected?: string | null;
  onPick: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="p-dg-chips" role="group" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className="p-dg-chip"
          // 沒有選中概念的快捷鍵不設 aria-pressed，避免螢幕閱讀器唸出
          // 一個永遠是「未按下」的狀態
          {...(selected === undefined ? {} : { "aria-pressed": selected === it.key })}
          onClick={() => onPick(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
