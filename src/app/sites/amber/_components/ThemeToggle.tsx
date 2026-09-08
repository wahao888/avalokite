"use client";

import { IconMoon, IconSun } from "./Icons";

// 深淺切換。
//
// 預設是**淺色**，不跟隨系統。這是刻意的：她的客人多半是從 LINE 群組點進來的，
// 而商品照是在店裡用手機拍的——淺色底下布料與膚色才是它們真正的樣子。
// 系統深色的人想要深色，按一下就有，而且會被記住。
//
// ⚠ 這個元件不持有 state。狀態是 <html data-theme>，由 layout 裡的
// THEME_BOOT 在第一次繪製前就設好（見那支腳本的註解）。
// 這裡兩顆圖示都渲染，由 CSS 決定顯示哪一顆——所以：
//   ・伺服器與客戶端的 HTML 完全一致，沒有 hydration mismatch
//   ・不必等 useEffect 才知道現在是哪個模式，按鈕不會先閃一下錯的圖示

export const THEME_KEY = "amber.theme";

/**
 * 在第一次繪製前套用主題的內聯腳本。
 *
 * 必須是同步的 inline script 且放在 <head>：任何非同步的做法都會先畫出
 * 淺色再跳成深色，那一下白閃在深色模式下特別刺眼。
 *
 * 因為預設就是淺色、而 CSS 的基準值也是淺色，「沒有存過偏好」的人
 * 這支腳本其實什麼都不用做——真正需要它的只有選過深色的人。
 */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export function ThemeToggle() {
  return (
    <button
      type="button"
      className="am-iconbtn am-theme"
      title="切換深色／淺色"
      onClick={() => {
        const root = document.documentElement;
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* 無痕模式：這一次切得動，只是下次進來會回到淺色 */
        }
      }}
    >
      {/* 目前是淺色 → 顯示月亮（按下去會變深色）*/}
      <span className="am-theme__dark">
        <IconMoon size={18} stroke={1.7} />
        <span className="am-sr">切換為深色模式</span>
      </span>
      {/* 目前是深色 → 顯示太陽 */}
      <span className="am-theme__light">
        <IconSun size={18} stroke={1.7} />
        <span className="am-sr">切換為淺色模式</span>
      </span>
    </button>
  );
}
