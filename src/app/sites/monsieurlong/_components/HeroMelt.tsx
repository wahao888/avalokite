"use client";

import Link from "next/link";
import { useRef } from "react";
import { m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ML, SITE } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   Hero — 融化的字

   三層，由後往前：
   ① 色塊場：幾團模糊的口味色，各自用 CSS transform 慢慢漂（18–30s）。
      模糊的圓互相重疊就會有「黏在一起、正在融化」的邊緣，不需要
      goo 濾鏡的 contrast() 疊加——那個在大面積上很貴，手機會掉幀。
      整層再隨指標做極小幅度的視差，只有一組 spring，成本可忽略。
   ② 巨大字體：逐字進場，捲動時上移並淡出。
   ③ 內容：狀態列、中文副標、CTA。

   prefers-reduced-motion：漂移由 CSS media query 停掉，
   逐字進場與視差由 useReducedMotion 直接跳過。
   ═══════════════════════════════════════════════════════════════ */

const WORD1 = "MONSIEUR";
const WORD2 = "LONG";

type Blob = { c: string; size: number; x: number; y: number; dur: number; delay: number; depth: number };

/**
 * 口味色直接拿來當背景色塊會出事：巧克力 #4A2E23、芝麻 #6E6058 這種
 * 深色一放大模糊，整個 Hero 的右半邊會糊成一片泥，字也讀不動。
 * 所以先把每個色推到「淺、不太飽和」的同色系，只留色相。
 */
function pastel(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  // 亮度 73%、飽和度夾在 46%〜72%。
  // 下限是為了讓芝麻灰、巧克力這類低飽和色推淡後不會變成純灰；
  // 上限與亮度是為了讓墨色標題壓在上面仍然讀得動。
  const sat = Math.min(Math.max(s, 0.46), 0.72);
  return `hsl(${Math.round(h)} ${Math.round(sat * 100)}% 73%)`;
}

function blobsFrom(colors: string[]): Blob[] {
  const base = colors.length >= 3 ? colors : ["#FFC732", "#FFE0A0", "#F5A93F", "#E9A8B8", "#B3CE8A"];
  // 最大那一團永遠是品牌黃，其餘才是今天的口味色——
  // 否則某天全是綠的抹茶柚子，Hero 就不像這家店了。
  const palette = ["#FFC732", ...base].map(pastel);
  const spec = [
    { size: 46, x: 8, y: 6, dur: 26, delay: 0, depth: 1 },
    { size: 34, x: 62, y: -6, dur: 21, delay: -6, depth: 0.6 },
    { size: 40, x: 74, y: 44, dur: 30, delay: -13, depth: 1.4 },
    { size: 26, x: 34, y: 56, dur: 18, delay: -4, depth: 0.8 },
    { size: 30, x: -4, y: 52, dur: 24, delay: -9, depth: 1.2 },
  ];
  return spec.map((s, i) => ({ ...s, c: palette[i % palette.length] }));
}

export default function HeroMelt({
  colors,
  statusLine,
}: {
  /** 今日供應的口味色；沒有資料時退回品牌色 */
  colors: string[];
  /** 例：今日供應 8 款・13:00 開賣 */
  statusLine: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const blobs = blobsFrom(colors);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-26%"]);
  const titleFade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const fieldY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);

  // 指標視差：整層色塊一起偏移，最多 ±22px
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 46, damping: 18, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 46, damping: 18, mass: 0.7 });

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width - 0.5) * 44);
    py.set(((e.clientY - r.top) / r.height - 0.5) * 30);
  };

  const letter = (ch: string, i: number, base: number) => (
    <m.span
      key={`${base}-${i}`}
      className="ml-ch"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: "0.42em", rotate: -5, filter: "blur(9px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
      transition={{
        duration: 1,
        delay: 0.1 + (base + i) * 0.038,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {ch}
    </m.span>
  );

  return (
    <section className="ml-hero" ref={ref} onPointerMove={onPointerMove}>
      <m.div className="ml-goo" style={{ x: sx, y: reduce ? 0 : sy, translateY: fieldY }} aria-hidden="true">
        <div className="ml-goo-field">
          {blobs.map((b, i) => (
            <span
              key={i}
              className="ml-blob"
              style={
                {
                  background: `radial-gradient(circle at 36% 34%, ${b.c} 0%, ${b.c} 58%, transparent 80%)`,
                  width: `${b.size}vmax`,
                  height: `${b.size}vmax`,
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  animationDuration: `${b.dur}s`,
                  animationDelay: `${b.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </m.div>

      <div className="ml-wrap ml-hero-in">
        <m.p
          className="ml-hero-kicker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
        >
          <b>{SITE.tagline}</b>
          <span aria-hidden="true">·</span>
          <span>{statusLine}</span>
        </m.p>

        <m.h1 className="ml-hero-title" style={{ y: titleY, opacity: titleFade }}>
          <span className="l1">{WORD1.split("").map((c, i) => letter(c, i, 0))}</span>

          {/* 第二行不逐字進場，改成「被冰淇淋灌滿」：
              先淡入描邊的空心字，再由下往上填入品牌黃。
              兩層疊字——下層只有描邊，上層是實心黃並用 clip-path 控制液面。 */}
          <m.span
            className="l2 ml-liquid"
            data-still={reduce ? "true" : undefined}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "0.18em", filter: "blur(10px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="ml-liquid-shadow" aria-hidden="true">
              {WORD2}
              <em>.</em>
            </span>
            <span className="ml-liquid-out">
              {WORD2}
              <em>.</em>
            </span>
            <span className="ml-liquid-in" aria-hidden="true">
              {WORD2}
              <em>.</em>
            </span>
          </m.span>
        </m.h1>

        <div className="ml-hero-sub">
          <m.p
            className="ml-hero-zh"
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.55 }}
          >
            大稻埕貴德街上的手工 Gelato，
            <br />
            每天現做，每天不一樣。
          </m.p>

          <m.div
            className="ml-hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.68 }}
          >
            <Link href={`${ML}/flavors`} className="ml-btn ml-btn--primary">
              看今天有什麼
            </Link>
            <a
              className="ml-btn ml-btn--ghost"
              href={SITE.directionsUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              前往店舖
            </a>
          </m.div>
        </div>

        <m.div
          className="ml-hero-scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          aria-hidden="true"
        >
          <i />
          <span>Scroll</span>
        </m.div>
      </div>
    </section>
  );
}
