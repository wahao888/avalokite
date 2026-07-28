"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 進場顯示（.ws-reveal → .ws-visible），子卡片 stagger
export default function WsScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".ws-reveal"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const kids = el.querySelectorAll<HTMLElement>(
            ".ws-card-i, .ws-catcard, .ws-flow__step, .ws-review, .ws-trust__item",
          );
          kids.forEach((kid, i) => {
            kid.style.transitionDelay = `${i * 0.07}s`;
          });
          el.classList.add("ws-visible");
          io.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
