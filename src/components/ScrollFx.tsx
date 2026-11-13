"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

// 進場淡入：觀察所有 .fade-in 元素，子卡片做 stagger 延遲
export default function ScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          // 格狀清單的每一格依序進場：只寫序號，延遲由 CSS 的 --stagger 計算。
          // 原本直接改子元素的 transitionDelay，連帶把滑鼠移上去的效果也延遲了，
          // 而且指到的類別（service-card、feature-item）在改版後已經不存在。
          entry.target.querySelectorAll(":scope > li").forEach((child, i) => {
            (child as HTMLElement).style.setProperty("--stagger", String(i));
          });
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
