"use client";

import { useEffect, useRef, useState } from "react";

// 互動式鉋刀刨花：hero 是一塊風化木板，游標是鉋刀。
// 按住拖曳 → 刨出較亮的新木紋、捲起刨花掉落；進場時自動示範刨一刀。
// prefers-reduced-motion → 靜態 SVG。

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shaving {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  turns: number;
  age: number;
  attached: number; // 附著在鉋刀上的成長期（秒）
  alpha: number;
  seed: number;
}

// 在 ctx 上畫木板（含木紋與節疤）。fresh=true 畫「刨開後」較亮的新木色
function paintPlank(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: number,
  fresh: boolean,
  seed: number,
) {
  const rand = mulberry32(seed);
  const x0 = pad;
  const y0 = pad;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  const r = 14;

  // 板面底色
  const g = ctx.createLinearGradient(0, y0, 0, y0 + ph);
  if (fresh) {
    g.addColorStop(0, "#e7cfa4");
    g.addColorStop(1, "#ddc190");
  } else {
    g.addColorStop(0, "#b08355");
    g.addColorStop(1, "#9c6f43");
  }
  ctx.beginPath();
  ctx.roundRect(x0, y0, pw, ph, r);
  ctx.fillStyle = g;
  ctx.fill();

  // 木紋：橫向波浪細線（seed 固定 → 新舊兩層紋路對齊）
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, pw, ph, r);
  ctx.clip();

  const lines = Math.max(14, Math.floor(ph / 13));
  for (let i = 0; i < lines; i++) {
    const baseY = y0 + (i + 0.5) * (ph / lines);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const amp1 = 2 + rand() * 3.5;
    const amp2 = 1 + rand() * 2;
    const alpha = 0.12 + rand() * 0.22;
    ctx.beginPath();
    for (let x = x0; x <= x0 + pw; x += 6) {
      const y =
        baseY +
        amp1 * Math.sin(x * 0.012 + p1) +
        amp2 * Math.sin(x * 0.031 + p2);
      if (x === x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = fresh
      ? `rgba(160, 110, 58, ${alpha})`
      : `rgba(84, 52, 28, ${alpha})`;
    ctx.lineWidth = 0.8 + rand() * 0.9;
    ctx.stroke();
  }

  // 兩個節疤
  for (let k = 0; k < 2; k++) {
    const kx = x0 + pw * (0.28 + k * 0.45) + (rand() - 0.5) * 30;
    const ky = y0 + ph * (0.3 + k * 0.35);
    for (let ring = 0; ring < 4; ring++) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, 5 + ring * 6, 3.5 + ring * 4.2, 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = fresh
        ? `rgba(150, 100, 50, ${0.4 - ring * 0.08})`
        : `rgba(70, 42, 22, ${0.45 - ring * 0.08})`;
      ctx.lineWidth = ring === 0 ? 2 : 1;
      ctx.stroke();
    }
  }
  ctx.restore();

  // 板緣：上緣亮、下緣暗（立體感）
  ctx.beginPath();
  ctx.roundRect(x0, y0, pw, ph, r);
  ctx.strokeStyle = fresh ? "rgba(120, 80, 40, 0.5)" : "rgba(60, 36, 18, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function HeroPlane() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced !== false) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobile = window.innerWidth < 720;
    const SEED = 20260728;
    const STROKE_W = isMobile ? 30 : 38; // 刨削寬度
    const MAX_SHAVINGS = isMobile ? 22 : 40;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let pad = 0;

    // 離屏層：舊木板 / 新木紋（刨開後）/ 刨痕累積層
    const base = document.createElement("canvas");
    const freshLayer = document.createElement("canvas");
    const planed = document.createElement("canvas");
    let freshPattern: CanvasPattern | null = null;
    const planedCtx = planed.getContext("2d")!;

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      pad = Math.max(10, Math.min(w, h) * 0.06);
      for (const c of [canvas, base, freshLayer, planed]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bctx = base.getContext("2d")!;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, h);
      paintPlank(bctx, w, h, pad, false, SEED);

      const fctx = freshLayer.getContext("2d")!;
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, w, h);
      paintPlank(fctx, w, h, pad, true, SEED);

      planedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      planedCtx.clearRect(0, 0, w, h);
      // 刨痕只落在板面範圍內
      planedCtx.beginPath();
      planedCtx.roundRect(pad + 3, pad + 3, w - pad * 2 - 6, h - pad * 2 - 6, 11);
      planedCtx.clip();
      // pattern 以裝置像素為單位 → 用 dpr 縮回 CSS 座標
      freshPattern = planedCtx.createPattern(freshLayer, "no-repeat");
      freshPattern?.setTransform(new DOMMatrix().scale(1 / dpr));
    };
    rebuild();
    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    const shavings: Shaving[] = [];
    const srand = mulberry32(SEED + 7);

    const pointer = { x: -9999, y: -9999, down: false, hover: false, px: -9999, py: -9999 };
    let carveDist = 0; // 距上次生刨花的累積距離

    const inPlank = (x: number, y: number) =>
      x > pad && x < w - pad && y > pad && y < h - pad;

    // 目前這一刀的完整路徑：每次移動整條重繪（避免分段圓頭陰影蓋住前段新木紋）
    let strokePath: { x: number; y: number }[] = [];

    const redrawStroke = () => {
      if (!freshPattern || strokePath.length < 2) return;
      planedCtx.lineCap = "round";
      planedCtx.lineJoin = "round";
      const trace = () => {
        planedCtx.beginPath();
        planedCtx.moveTo(strokePath[0].x, strokePath[0].y);
        for (let i = 1; i < strokePath.length; i++) {
          planedCtx.lineTo(strokePath[i].x, strokePath[i].y);
        }
      };
      // 溝緣陰影
      planedCtx.strokeStyle = "rgba(80, 50, 26, 0.5)";
      planedCtx.lineWidth = STROKE_W + 4;
      trace();
      planedCtx.stroke();
      // 新木紋
      planedCtx.strokeStyle = freshPattern;
      planedCtx.lineWidth = STROKE_W;
      trace();
      planedCtx.stroke();
    };

    // 刨一段：延伸目前筆畫並重繪，依距離生刨花
    const carve = (fx: number, fy: number, tx: number, ty: number) => {
      if (!freshPattern) return;
      if (strokePath.length === 0) strokePath.push({ x: fx, y: fy });
      strokePath.push({ x: tx, y: ty });
      if (strokePath.length > 120) strokePath = strokePath.slice(-120);
      redrawStroke();

      const dx = tx - fx;
      const dy = ty - fy;
      const d = Math.hypot(dx, dy);
      carveDist += d;
      // 每刨 26px 捲一片刨花
      while (carveDist > 26) {
        carveDist -= 26;
        if (shavings.length >= MAX_SHAVINGS) shavings.shift();
        const dir = Math.atan2(dy, dx);
        shavings.push({
          x: tx,
          y: ty - 6,
          vx: Math.cos(dir) * -30 + (srand() - 0.5) * 40,
          vy: -60 - srand() * 50,
          rot: srand() * Math.PI * 2,
          vrot: (srand() - 0.5) * 5,
          size: 7 + srand() * 7,
          turns: 2 + srand() * 1.6,
          age: 0,
          attached: 0.12 + srand() * 0.08,
          alpha: 0.95,
          seed: srand() * 10,
        });
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointer.hover = true;
      if (pointer.down && inPlank(x, y) && pointer.px > -9000) {
        carve(pointer.px, pointer.py, x, y);
      }
      pointer.px = pointer.x = x;
      pointer.py = pointer.y = y;
    };
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      pointer.down = true;
      strokePath = [];
      // 使用者自己動手了 → 取消自動示範
      demoCancelled = true;
      demoPrev = null;
      const rect = canvas.getBoundingClientRect();
      pointer.px = pointer.x = e.clientX - rect.left;
      pointer.py = pointer.y = e.clientY - rect.top;
    };
    const onUp = () => {
      pointer.down = false;
      carveDist = 0;
      strokePath = [];
    };
    const onLeave = () => {
      pointer.hover = false;
      pointer.down = false;
      pointer.x = pointer.y = pointer.px = pointer.py = -9999;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    // 進場自動示範：一把幽靈鉋刀從左到右刨一刀
    const DEMO_START = 0.7;
    const DEMO_DUR = 1.5;
    let demoPrev: { x: number; y: number } | null = null;
    let demoCancelled = false;

    const drawPlaneTool = (x: number, y: number, tilt: number, ghost: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.globalAlpha = ghost ? 0.75 : 1;
      // 鉋台
      ctx.beginPath();
      ctx.roundRect(-26, -14, 52, 16, 4);
      ctx.fillStyle = "#4a2f1d";
      ctx.fill();
      // 鉋刀刃
      ctx.beginPath();
      ctx.moveTo(-4, 2);
      ctx.lineTo(8, 2);
      ctx.lineTo(6, 7);
      ctx.lineTo(-2, 7);
      ctx.closePath();
      ctx.fillStyle = "#8d8d8d";
      ctx.fill();
      // 手柄
      ctx.beginPath();
      ctx.roundRect(-9, -26, 18, 13, 6);
      ctx.fillStyle = "#7a4a2b";
      ctx.fill();
      ctx.restore();
    };

    const drawShaving = (s: Shaving) => {
      // 阿基米德螺線刨花
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha;
      const grow = Math.min(1, s.age / s.attached);
      ctx.beginPath();
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * grow;
        const ang = t * s.turns * Math.PI * 2 + s.seed;
        const rad = 1.5 + t * s.size;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad * 0.85;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ecd9b0";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.stroke();
      // 內側陰影線增加厚度感
      ctx.globalAlpha = s.alpha * 0.5;
      ctx.strokeStyle = "#c9a86e";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    let last = performance.now();
    let animT = 0; // 只在影格實際執行時累積（分頁在背景時 rAF 暫停，示範不會被跳過）
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      animT += dt;
      const t = animT;

      // 自動示範
      let demoPos: { x: number; y: number; tilt: number } | null = null;
      if (!demoCancelled && t > DEMO_START && t < DEMO_START + DEMO_DUR) {
        const p = (t - DEMO_START) / DEMO_DUR;
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const x = pad + (w - pad * 2) * (0.12 + 0.72 * ease);
        const y = pad + (h - pad * 2) * 0.34 + Math.sin(p * Math.PI) * 6;
        if (demoPrev) carve(demoPrev.x, demoPrev.y, x, y);
        demoPrev = { x, y };
        demoPos = { x, y: y - 10, tilt: -0.06 };
      } else if (t >= DEMO_START + DEMO_DUR && demoPrev) {
        demoPrev = null;
        strokePath = [];
      }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      ctx.drawImage(planed, 0, 0, w, h);

      // 刨花物理
      for (let i = shavings.length - 1; i >= 0; i--) {
        const s = shavings[i];
        s.age += dt;
        if (s.age > s.attached) {
          s.vy += 300 * dt; // 重力
          s.vx *= 0.995;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.vrot * dt;
          if (s.y > h - pad * 0.3) s.alpha -= 2.2 * dt; // 落到底部淡出
          if (s.age > 2.6) s.alpha -= 1.4 * dt;
        }
        if (s.alpha <= 0.02) {
          shavings.splice(i, 1);
          continue;
        }
        drawShaving(s);
      }

      // 鉋刀
      if (demoPos) {
        drawPlaneTool(demoPos.x, demoPos.y, demoPos.tilt, true);
      } else if (pointer.hover && pointer.x > -9000 && inPlank(pointer.x, pointer.y)) {
        drawPlaneTool(pointer.x, pointer.y - 8, pointer.down ? -0.08 : 0, false);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  // 靜態 SVG fallback（reduced-motion 或尚未判定時）
  if (reduced !== false) {
    return (
      <div className="ws-hero__canvas ws-hero__canvas--plane" aria-hidden="true">
        <svg viewBox="0 0 400 400">
          <rect x="28" y="90" width="344" height="220" rx="14" fill="#a87a4d" />
          <g stroke="#54341c" strokeWidth="1" fill="none" opacity="0.5">
            <path d="M40 120 C 140 116, 260 124, 360 118" />
            <path d="M40 150 C 150 146, 250 156, 360 150" />
            <path d="M40 250 C 140 246, 260 254, 360 248" />
            <path d="M40 280 C 150 276, 250 286, 360 280" />
          </g>
          <rect x="40" y="170" width="320" height="60" rx="10" fill="#e2c79b" />
          <g stroke="#a06e3a" strokeWidth="1" fill="none" opacity="0.6">
            <path d="M48 186 C 150 182, 260 190, 352 184" />
            <path d="M48 202 C 150 198, 250 208, 352 202" />
            <path d="M48 216 C 150 212, 260 220, 352 216" />
          </g>
          <path
            d="M300 150 a12 12 0 1 1 8 -20 a9 9 0 1 1 10 -8"
            fill="none"
            stroke="#ecd9b0"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect x="28" y="90" width="344" height="220" rx="14" fill="none" stroke="#3c2412" strokeWidth="2" opacity="0.5" />
        </svg>
      </div>
    );
  }

  return (
    <div className="ws-hero__canvas ws-hero__canvas--plane" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
