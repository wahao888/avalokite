"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/* ═══════════════════════════════════════════════════════════════
   融化的邊緣

   店家自己的視覺語言：IG 限動就是一條黃色色帶，下緣掛著滴垂，
   底下是米白紙。這裡把它做成會動的——滴垂會慢慢伸長縮短，
   偶爾掉一滴下來；桌機上滑鼠靠近時那幾滴會被「拉」得更長。

   ── 形狀為什麼是 SVG 而不是 clip-path ──
   第一版用 clip-path: polygon()，但多邊形的每個頂點都是折角，
   邊緣會看得到一節一節的稜線，一點都不像融化的東西。
   改成一條貝茲曲線的路徑：曲線在任何縮放下都還是曲線，不會出現折角。
   路徑的接點刻意讓前後控制點共線，連曲率都是連續的。

   最上面刻意做成外擴的「凹弧」（surface tension fillet）——
   真正的液體垂下來時，跟母體交接處是往外張開的圓角，不是直角。
   少了這個弧，滴垂看起來就像黏上去的柱子。

   ── 為什麼不用 SVG goo 濾鏡（feGaussianBlur + feColorMatrix）──
   那是做金屬球融合的標準手法，但濾鏡每一幀都要重算整個區域，
   滿版寬度在中階手機上會直接掉幀。這裡的伸縮只動 transform: scaleY，
   交給合成器，成本近乎為零。
   ═══════════════════════════════════════════════════════════════ */

/**
 * 一滴的輪廓，畫在 100×100 的 viewBox 裡。
 * 由上而下：外擴的凹弧肩膀 → 收窄的頸子 → 張開的圓球 → 圓底。
 * 搭配 preserveAspectRatio="none"：水平方向不會變形（每滴寬度是固定 px），
 * 垂直方向隨長度拉伸——那正好就是水滴被拉長的樣子。
 */
const DRIP_PATH =
  // 肩膀：從 (0,0) 幾乎「水平」離開色帶再往下彎——這樣接縫看不出來。
  // 若一開始就往下走（切線接近垂直），交界處會有一道明顯的稜，
  // 看起來像黏上去的柱子而不是流下來的液體。
  "M0,0 C12,2 22,8 30,28 " +
  // 頸子 → 圓球（控制點與前一段共線，曲率連續，不會出現折角）
  "C34,38 10,52 10,70 " +
  "C10,88 28,100 50,100 " +
  "C72,100 90,88 90,70 " +
  "C90,52 66,38 70,28 " +
  "C78,8 88,2 100,0 Z";

type Drip = {
  /** 位置（%）、寬度（px）、長度倍率、呼吸週期（s）、相位（s） */
  x: number;
  w: number;
  len: number;
  dur: number;
  delay: number;
};

// 固定不隨機：Math.random() 會讓 SSR 與 CSR 對不上。
// 寬窄長短刻意差很多（14px 到 56px、0.3 到 1.3 倍長），間距也不等分——
// 等寬等距會看起來像流蘇，不像融化。
const DRIPS: Drip[] = [
  { x: 3, w: 46, len: 0.78, dur: 9, delay: -1.2 },
  { x: 9, w: 20, len: 0.3, dur: 6, delay: -4 },
  { x: 17, w: 70, len: 1.28, dur: 12, delay: -2.6 },
  { x: 24, w: 25, len: 0.42, dur: 7, delay: 0 },
  { x: 33, w: 38, len: 0.62, dur: 8.5, delay: -5.5 },
  { x: 39, w: 60, len: 1.05, dur: 11, delay: -3 },
  { x: 48, w: 22, len: 0.34, dur: 6.5, delay: -1.8 },
  { x: 55, w: 52, len: 0.88, dur: 10, delay: -6 },
  { x: 64, w: 30, len: 0.5, dur: 7.5, delay: -0.6 },
  { x: 70, w: 76, len: 1.3, dur: 13, delay: -4.8 },
  { x: 79, w: 21, len: 0.32, dur: 6.2, delay: -2.2 },
  { x: 86, w: 44, len: 0.72, dur: 9.5, delay: -7 },
  { x: 94, w: 33, len: 0.55, dur: 8, delay: -3.4 },
];

// 掉落的水滴只留三顆，週期拉很長——這是「偶爾」，不是下雨。
const DROPS = [
  { x: 31, size: 13, dur: 9, delay: 2 },
  { x: 71, size: 11, dur: 11, delay: 7 },
  { x: 13, size: 9, dur: 13, delay: 12.5 },
];

export default function MeltEdge({
  color = "var(--ml-yellow)",
  /**
   * 最長那一滴的長度（px）。**不給就交給 CSS**（桌機 72px、手機 38px）——
   * 行內樣式的優先序高於 media query，寫死在這裡會讓手機的縮短規則失效，
   * 滴垂就會蓋到下一個區塊的內容。
   */
  depth,
  /** 桌機滑鼠靠近時把滴垂拉長 */
  interactive = true,
  className,
}: {
  color?: string;
  depth?: number;
  interactive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // 滑鼠在容器內的相對位置（0–100）。null = 沒有滑鼠或已離開
  const [px, setPx] = useState<number | null>(null);

  useEffect(() => {
    if (!interactive || reduce) return;
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (frame) return; // 每幀最多算一次
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        // 只在色帶上下 220px 的範圍內反應，滑過整頁不會一直觸發
        if (e.clientY < r.top - 220 || e.clientY > r.bottom + 220) {
          setPx(null);
          return;
        }
        setPx(((e.clientX - r.left) / r.width) * 100);
      });
    };
    const onLeave = () => setPx(null);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [interactive, reduce]);

  /** 滑鼠越近拉得越長，18% 之外就沒有影響 */
  const pull = (x: number) => {
    if (px === null) return 1;
    const d = Math.abs(px - x);
    if (d > 18) return 1;
    return 1 + (1 - d / 18) * 0.85;
  };

  return (
    <div
      ref={ref}
      className={`ml-melt ${className ?? ""}`}
      style={{
        ["--ml-melt-color" as string]: color,
        ...(depth === undefined ? {} : { ["--ml-melt-depth" as string]: `${depth}px` }),
      }}
      aria-hidden="true"
    >
      {DRIPS.map((d, i) => (
        <span
          key={i}
          className="ml-melt-drip"
          style={
            {
              left: `${d.x}%`,
              // 寬度乘上 --ml-melt-w：手機用同一組滴垂但整體縮窄，
              // 否則 46–76px 的肩膀在 375px 螢幕上會全部併成一坨。
              ["--w" as string]: d.w,
              width: "calc(var(--w) * var(--ml-melt-w, 1) * 1px)",
              height: `calc(var(--ml-melt-depth) * ${d.len})`,
              marginLeft: "calc(var(--w) * var(--ml-melt-w, 1) * -0.5px)",
              animationDuration: `${d.dur}s`,
              animationDelay: `${d.delay}s`,
              // 指標拉伸疊在 CSS 呼吸動畫之上，用獨立變數避免互相覆寫
              ["--ml-pull" as string]: pull(d.x).toFixed(3),
            } as React.CSSProperties
          }
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
            <path d={DRIP_PATH} fill="currentColor" />
          </svg>
        </span>
      ))}

      {!reduce &&
        DROPS.map((d, i) => (
          <span
            key={`drop-${i}`}
            className="ml-melt-drop"
            style={
              {
                left: `${d.x}%`,
                width: d.size,
                height: d.size * 1.15,
                marginLeft: -d.size / 2,
                animationDuration: `${d.dur}s`,
                animationDelay: `${d.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
