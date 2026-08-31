"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

/**
 * 全站共用的進場動畫：模糊 6px→0、上移 18px→0。
 *
 * 刻意只做這一種。90% 的區塊用同一條曲線與同一段距離，畫面才會有節奏；
 * 每個區塊各自發明一種進場，看起來就是 AI 拼出來的。
 *
 * once + amount 0.25：只播一次，捲回去不會重播（重播很煩，也浪費效能）。
 */
export default function Reveal({
  children,
  delay = 0,
  y = 18,
  as = "div",
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "article" | "header";
  className?: string;
}) {
  const C = m[as];
  return (
    <C
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </C>
  );
}

/** 一組同類項目依序進場。stagger 給 60ms，再多會拖，再少看不出來。 */
export function RevealStagger({
  children,
  className,
  step = 0.06,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  as?: "div" | "ul" | "ol";
}) {
  const C = m[as];
  return (
    <C
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: step } } }}
    >
      {children}
    </C>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const C = m[as];
  return (
    <C
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
        shown: { opacity: 1, y: 0, filter: "blur(0px)" },
      }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </C>
  );
}
