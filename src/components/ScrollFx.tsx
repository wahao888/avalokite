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
          const children = entry.target.querySelectorAll(
            ".service-card, .price-card, .case-card, .feature-item, .stat-card"
          );
          children.forEach((child, i) => {
            (child as HTMLElement).style.transitionDelay = `${i * 0.08}s`;
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
