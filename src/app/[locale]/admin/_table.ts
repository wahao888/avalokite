// 後台表格的共用樣式。後台不走品牌視覺，只求一屏塞得下最多資訊，
// 所以是行內樣式而不是 globals.css 的 class——沒有第二個地方會用到它們。

import type { CSSProperties } from "react";

export const cellStyle: CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderBottom: "1px solid var(--border)",
  fontSize: "0.8rem",
  verticalAlign: "top",
  textAlign: "left",
};

export const headStyle: CSSProperties = {
  ...cellStyle,
  fontFamily: "var(--font-mono)",
  fontSize: "0.62rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

export function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "-";
}
