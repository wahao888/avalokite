"use client";

import { useEffect, useRef, useState } from "react";

// 流動木紋場：滿版橫向木紋細線如水流繞過游標；點擊「種下」節疤，
// 木紋從此永久繞著它走（sessionStorage 記住）。文字直接疊在上面。
//
// 實作重點（質感）：
// - 年輪線以不規則間距成群分布（疏密交錯，仿真實木紋）
// - 底層早晚材寬色帶 + 表層細線 + 木質毛孔短斑，三層疊出深度
// - 繞流公式 y' = ky ± sqrt(dy² + R²·exp(-dx²/2σ²))：線永不穿過節疤、
//   在節疤表面收攏貼合，遠處自然回復——與真實木紋繞節疤的形態一致
// - 游標是帶彈簧延遲的軟障礙物，離開後緩慢回復，像水流
// - prefers-reduced-motion：靜態繪製，仍可點擊種節疤（無過場動畫）

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GrainLine {
  baseY: number; // 相對高度 0–1
  width: number;
  alpha: number;
  tone: number; // 0 一般棕 / 1 亮棕 / 2 深棕
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  swell: number; // 長波振幅
}

interface Band {
  baseY: number;
  width: number;
  alpha: number;
  p1: number;
  p2: number;
  swell: number;
}

interface Pore {
  x: number; // 相對 0–1
  y: number;
  len: number;
  alpha: number;
  p: number;
}

interface Knot {
  x: number; // 相對 0–1（resize 安全）
  y: number;
  r: number; // 目標半徑（px）
  born: number; // animT 時間
  seed: number;
  dying?: number; // 開始淡出的 animT
}

interface Ripple {
  x: number;
  y: number;
  born: number;
}

const STORAGE_KEY = "ws-hero-knots";
const MAX_KNOTS = 4;

function loadKnots(): Knot[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as { x: number; y: number; r: number; seed: number }[];
    return arr.slice(0, MAX_KNOTS).map((k) => ({ ...k, born: -10 }));
  } catch {
    return [];
  }
}

function saveKnots(knots: Knot[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(knots.filter((k) => !k.dying).map(({ x, y, r, seed }) => ({ x, y, r, seed }))),
    );
  } catch {
    /* ignore */
  }
}

export default function HeroGrainField() {
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
    if (reduced === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isStatic = reduced === true;

    const isMobile = window.innerWidth < 720;
    const SEED = 20260729;
    const STEP = isMobile ? 14 : 9; // 取樣間距
    const rand = mulberry32(SEED);

    let w = 0;
    let h = 0;
    let dpr = 1;

    // ---------- 木紋資料（相對座標，resize 不變形） ----------
    const lines: GrainLine[] = [];
    {
      // 不規則間距成群：小間距密集群 + 偶爾大間隙
      let y = -0.02;
      while (y < 1.03) {
        const clustered = rand() < 0.65;
        const gap = clustered ? 0.006 + rand() * 0.012 : 0.02 + rand() * 0.035;
        y += gap;
        const toneRoll = rand();
        lines.push({
          baseY: y,
          width: 0.6 + rand() * (clustered ? 0.8 : 1.3),
          alpha: 0.09 + rand() * 0.21,
          tone: toneRoll < 0.62 ? 0 : toneRoll < 0.88 ? 1 : 2,
          p1: rand() * Math.PI * 2,
          p2: rand() * Math.PI * 2,
          p3: rand() * Math.PI * 2,
          p4: rand() * Math.PI * 2,
          swell: 3 + rand() * 8,
        });
      }
    }
    const bands: Band[] = Array.from({ length: 12 }, () => ({
      baseY: rand(),
      width: 14 + rand() * 30,
      alpha: 0.028 + rand() * 0.035,
      p1: rand() * Math.PI * 2,
      p2: rand() * Math.PI * 2,
      swell: 6 + rand() * 10,
    }));
    const pores: Pore[] = Array.from({ length: isMobile ? 110 : 230 }, () => ({
      x: rand(),
      y: rand(),
      len: 2 + rand() * 5,
      alpha: 0.04 + rand() * 0.09,
      p: rand() * Math.PI * 2,
    }));

    const knots: Knot[] = loadKnots();
    const ripples: Ripple[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (isStatic) render(9999);
    };

    // ---------- 游標（彈簧跟隨的軟障礙物） ----------
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, target: 0 };
    const CURSOR_R = isMobile ? 30 : 46;

    // ---------- 繞流位移 ----------
    const deflect = (x: number, y: number, kx: number, ky: number, R: number, strength: number) => {
      const dx = x - kx;
      const sigma = R * 1.9;
      const g = Math.exp((-dx * dx) / (2 * sigma * sigma));
      if (g < 0.004) return y;
      const dy = y - ky;
      const hug = R * R * g * strength;
      const side = dy === 0 ? 1 : Math.sign(dy);
      return ky + side * Math.sqrt(dy * dy + hug);
    };

    const knotRadius = (k: Knot, t: number) => {
      const grow = Math.min(1, Math.max(0, (t - k.born) / 1.1));
      const e = 1 - Math.pow(1 - grow, 3);
      let r = k.r * e;
      if (k.dying !== undefined) {
        const d = Math.min(1, (t - k.dying) / 0.9);
        r *= 1 - d;
      }
      return r;
    };

    // y 經過所有障礙物（節疤 → 游標）的最終位置
    const flowY = (x: number, y: number, t: number) => {
      let yy = y;
      for (const k of knots) {
        const r = knotRadius(k, t);
        if (r > 1) yy = deflect(x, yy, k.x * w, k.y * h, r, 1);
      }
      if (cursor.s > 0.01 && cursor.x > -9000) {
        yy = deflect(x, yy, cursor.x, cursor.y, CURSOR_R, cursor.s);
      }
      return yy;
    };

    // ---------- 節疤繪製（擬真：髓心、雜環、裂紋、高光） ----------
    const drawKnot = (k: Knot, t: number) => {
      const r = knotRadius(k, t);
      if (r < 1) return;
      const kx = k.x * w;
      const ky = k.y * h;
      const kr = mulberry32(Math.floor(k.seed * 1e9) || 7);
      const squish = 0.72 + kr() * 0.14; // 縱向壓扁
      const rot = (kr() - 0.5) * 0.5;
      const fade = k.dying !== undefined ? Math.max(0, 1 - (t - k.dying) / 0.9) : 1;

      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(rot);
      ctx.globalAlpha = fade;

      // 外圈暈影（讓周圍木紋看起來被「吸」進來）
      let g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.5);
      g.addColorStop(0, "rgba(96, 60, 32, 0.18)");
      g.addColorStop(1, "rgba(96, 60, 32, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 1.5 * squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // 髓心
      g = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 0, 0, 0, r * 0.62);
      g.addColorStop(0, "rgba(62, 38, 20, 0.92)");
      g.addColorStop(0.55, "rgba(84, 52, 28, 0.75)");
      g.addColorStop(1, "rgba(104, 66, 36, 0.25)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.62, r * 0.62 * squish, 0, 0, Math.PI * 2);
      ctx.fill();

      // 不規則年輪環
      const ringN = 4;
      for (let i = 0; i < ringN; i++) {
        const rr = r * (0.34 + (i / ringN) * 0.62);
        const ph = kr() * Math.PI * 2;
        const wob = 0.05 + kr() * 0.08;
        ctx.beginPath();
        for (let a = 0; a <= 40; a++) {
          const ang = (a / 40) * Math.PI * 2;
          const rad = rr * (1 + wob * Math.sin(ang * 3 + ph));
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad * squish;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(66, 40, 22, ${0.5 - i * 0.09})`;
        ctx.lineWidth = i === 0 ? 1.6 : 1;
        ctx.stroke();
      }

      // 裂紋（由髓心向外 2–3 條）
      const cracks = 2 + Math.floor(kr() * 2);
      for (let i = 0; i < cracks; i++) {
        const ang = kr() * Math.PI * 2;
        const len = r * (0.35 + kr() * 0.45);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r * 0.1, Math.sin(ang) * r * 0.1 * squish);
        const midA = ang + (kr() - 0.5) * 0.5;
        ctx.quadraticCurveTo(
          Math.cos(midA) * len * 0.6,
          Math.sin(midA) * len * 0.6 * squish,
          Math.cos(ang) * len,
          Math.sin(ang) * len * squish,
        );
        ctx.strokeStyle = "rgba(50, 30, 16, 0.55)";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      // 左上高光
      ctx.beginPath();
      ctx.ellipse(-r * 0.28, -r * 0.3 * squish, r * 0.3, r * 0.16, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(236, 217, 176, 0.14)";
      ctx.fill();

      ctx.restore();
    };

    // ---------- 主繪製 ----------
    const render = (t: number) => {
      // 底：紙感漸層 + 右上暖光 + 極淡邊暈
      let bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#f7f2e8");
      bg.addColorStop(1, "#eee5d1");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      bg = ctx.createRadialGradient(w * 0.85, -h * 0.1, 0, w * 0.85, -h * 0.1, w * 0.7);
      bg.addColorStop(0, "rgba(184, 129, 63, 0.12)");
      bg.addColorStop(1, "rgba(184, 129, 63, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const wob = (x: number, L: { p1: number; p2: number; p3?: number; p4?: number; swell: number }, amp: number) =>
        Math.sin(x * 0.0042 + L.p1) * L.swell +
        Math.sin(x * 0.0007 + L.p2 + t * 0.22) * amp * 2.2 +
        (L.p3 !== undefined ? Math.sin(x * 0.013 + L.p3 - t * 0.16) * amp : 0) +
        (L.p4 !== undefined ? Math.sin(x * 0.027 + L.p4) * 0.8 : 0);

      // 早晚材寬色帶（底層）
      for (const b of bands) {
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += STEP * 2) {
          const y = flowY(x, b.baseY * h + wob(x, b, 1.4), t);
          if (x <= -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(158, 108, 58, ${b.alpha})`;
        ctx.lineWidth = b.width;
        ctx.stroke();
      }

      // 細木紋線
      const TONES = ["122, 74, 43", "158, 104, 52", "84, 52, 28"];
      for (const L of lines) {
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += STEP) {
          const y = flowY(x, L.baseY * h + wob(x, L, 1.6), t);
          if (x <= -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${TONES[L.tone]}, ${L.alpha})`;
        ctx.lineWidth = L.width;
        ctx.stroke();
      }

      // 木質毛孔（順紋短斑）
      ctx.lineCap = "round";
      for (const p of pores) {
        const px = p.x * w;
        const py0 = p.y * h + Math.sin(px * 0.005 + p.p + t * 0.2) * 3;
        const y1 = flowY(px, py0, t);
        const y2 = flowY(px + p.len, py0, t);
        ctx.beginPath();
        ctx.moveTo(px, y1);
        ctx.lineTo(px + p.len, y2);
        ctx.strokeStyle = `rgba(74, 47, 29, ${p.alpha})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // 節疤
      for (const k of knots) drawKnot(k, t);

      // 種下漣漪
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const age = t - rp.born;
        if (age > 1.2) {
          ripples.splice(i, 1);
          continue;
        }
        const pr = age / 1.2;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 10 + pr * 70, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(184, 129, 63, ${0.5 * (1 - pr)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 文字側可讀性帷幕（左側木紋轉淡）
      const veil = ctx.createLinearGradient(0, 0, w * 0.72, 0);
      veil.addColorStop(0, "rgba(246, 241, 231, 0.55)");
      veil.addColorStop(0.55, "rgba(246, 241, 231, 0.28)");
      veil.addColorStop(1, "rgba(246, 241, 231, 0)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
    };

    // ---------- 事件（掛在 hero 區塊上，canvas 本身 pointer-events:none） ----------
    const host = canvas.closest(".ws-hero") ?? canvas.parentElement!;

    const toLocal = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      cursor.tx = p.x;
      cursor.ty = p.y;
      cursor.target = 1;
      if (cursor.x < -9000) {
        cursor.x = p.x;
        cursor.y = p.y;
      }
    };
    const onLeave = () => {
      cursor.target = 0;
    };

    let animT = 0;

    const plant = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea")) return;
      const p = toLocal(e);
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) return;
      // 淘汰最舊的
      const alive = knots.filter((k) => k.dying === undefined);
      if (alive.length >= MAX_KNOTS) {
        alive[0].dying = animT;
        setTimeout(() => {
          const idx = knots.indexOf(alive[0]);
          if (idx >= 0) knots.splice(idx, 1);
        }, 1000);
      }
      knots.push({
        x: p.x / w,
        y: p.y / h,
        r: (isMobile ? 22 : 30) + Math.random() * 14,
        born: animT,
        seed: Math.random(),
      });
      ripples.push({ x: p.x, y: p.y, born: animT });
      saveKnots(knots);
      if (isStatic) render(9999);
    };

    host.addEventListener("pointermove", onMove as EventListener);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("click", plant as EventListener);

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ---------- 迴圈（畫面外自動暫停） ----------
    let raf = 0;
    let running = false;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      animT += dt;

      // 游標彈簧
      cursor.s += (cursor.target - cursor.s) * (cursor.target > cursor.s ? 0.07 : 0.03);
      if (cursor.tx > -9000) {
        cursor.x += (cursor.tx - cursor.x) * 0.1;
        cursor.y += (cursor.ty - cursor.y) * 0.1;
      }

      render(animT);
    };

    let io: IntersectionObserver | null = null;
    if (!isStatic) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !running) {
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(frame);
          } else if (!entry.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0.02 },
      );
      io.observe(canvas);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      host.removeEventListener("pointermove", onMove as EventListener);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("click", plant as EventListener);
    };
  }, [reduced]);

  return (
    <div className="ws-hero__field" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
