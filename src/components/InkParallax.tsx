"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * 墨跡層的視差位移
 *
 * 只動 transform，交給合成層處理，不碰 layout 也不重繪。只有在視窗內的層會更新，
 * 捲動事件 rAF 節流。900px 以下與 prefers-reduced-motion 直接不啟用——行動版是
 * 大部分詢問單的來源，視差在手機上最容易吃掉 INP。
 */

const SHIFT_PX = 70;

export default function InkParallax() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 901px)").matches) return;

    const layers = Array.from(document.querySelectorAll<HTMLElement>(".ink-wash"));
    if (layers.length === 0) return;

    const visible = new Set<HTMLElement>();
    let raf = 0;

    const apply = () => {
      raf = 0;
      const vh = window.innerHeight;
      visible.forEach((layer) => {
        const host = layer.parentElement;
        if (!host) return;
        const r = host.getBoundingClientRect();
        // 區塊中心還在視窗下方時為負、捲到上方時為正
        const span = (vh + r.height) / 2;
        const p = span > 0 ? (vh / 2 - (r.top + r.height / 2)) / span : 0;
        const shift = Math.max(-1, Math.min(1, p)) * SHIFT_PX;
        layer.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visible.add(el);
          else visible.delete(el);
        });
        if (visible.size > 0) schedule();
      },
      { rootMargin: "25% 0px" }
    );
    layers.forEach((l) => {
      l.dataset.parallax = "on";
      io.observe(l);
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      layers.forEach((l) => {
        delete l.dataset.parallax;
        l.style.transform = "";
      });
    };
  }, [pathname]);

  return null;
}
