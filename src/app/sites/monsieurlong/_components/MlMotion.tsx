"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * 全站唯一的 Motion 進入點。
 *
 * ① LazyMotion + domAnimation：只載入 DOM 動畫需要的那一份 feature bundle，
 *    比完整的 `motion` 元件小很多。strict 會讓誤用 `motion.*`（而非 `m.*`）
 *    直接丟例外，避免有人不小心把整包拉回來。
 * ② reducedMotion="user"：作業系統開了「減少動態效果」時，所有 transform／
 *    layout 動畫自動停用，只留 opacity。純 CSS 的部分由 monsieurlong.css
 *    的 media query 收尾。
 */
export default function MlMotion({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
