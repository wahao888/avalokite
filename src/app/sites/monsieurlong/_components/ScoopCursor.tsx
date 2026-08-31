"use client";

import { useEffect, useState } from "react";
import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * 跟著游標的一勺。
 *
 * 滑過口味卡時會換成那個口味的顏色——這是全站「顏色＝口味」這條規則
 * 最直接的一次演出。只在有精準指標的裝置掛載（觸控裝置完全不載入），
 * 開了「減少動態效果」也不掛載。
 *
 * 只動 transform 與 opacity，並用 mix-blend-mode: multiply 融進紙色，
 * 不會重繪版面。
 */
export default function ScoopCursor() {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [color, setColor] = useState("#FFC732");

  const x = useMotionValue(-999);
  const y = useMotionValue(-999);
  const sx = useSpring(x, { stiffness: 220, damping: 26, mass: 0.55 });
  const sy = useSpring(y, { stiffness: 220, damping: 26, mass: 0.55 });
  const scale = useMotionValue(1);
  const sScale = useSpring(scale, { stiffness: 180, damping: 22 });
  const opacity = useMotionValue(0);

  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setOn(true);

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX - 95);
      y.set(e.clientY - 95);
      opacity.set(0.55);

      const el = (e.target as Element | null)?.closest?.(".ml-card, [data-scoop-color]");
      if (el instanceof HTMLElement) {
        const c =
          el.dataset.scoopColor ??
          getComputedStyle(el).getPropertyValue("--ml-card-color").trim();
        if (c) {
          setColor(c);
          scale.set(1.35);
          return;
        }
      }
      scale.set(1);
    };
    const leave = () => opacity.set(0);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [reduce, x, y, scale, opacity]);

  if (!on) return null;

  return (
    <m.div
      className="ml-scoop-cursor"
      aria-hidden="true"
      style={{ x: sx, y: sy, scale: sScale, opacity, background: color }}
    />
  );
}
