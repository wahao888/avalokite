"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * 捲到才淡入。刻意不用 motion 那一套：
 * 這個站需要的只是「一個 IntersectionObserver + 一條 CSS transition」，
 * 為了它多載一個動畫函式庫不划算（見 rekat.css 的 .rk-reveal）。
 *
 * 初始狀態是 CSS 的 opacity: 0，所以 JS 沒跑起來時內容會是隱形的——
 * layout.tsx 的 <noscript> 有兜底規則把它們拉回來。
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 掛載當下就在視窗內（首屏）的直接打開，不等 observer。
    // IntersectionObserver 的回呼綁在算繪流程上，分頁在背景時不會被呼叫——
    // 少了這一步，「在背景分頁載入、切回來之前」那段時間整頁會是空白的。
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.dataset.in = "1";
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.in = "1";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`rk-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
