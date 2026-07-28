"use client";

import { useEffect, useRef, useState } from "react";

// 榫卯組裝：放大的燕尾榫，上板（淺楓木）可拖曳／隨捲動下降，
// 與下板（深胡桃）的燕尾榫頭咬合。到位瞬間：過衝壓縮、縫線閃光、
// 木屑迸出、輕微震動，然後烙上「文山」印記。組裝狀態存 sessionStorage。
// prefers-reduced-motion → 靜態組裝完成圖。

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STORAGE_KEY = "ws-hero-joint";
const REST_P = 0.22;

interface Speck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

export default function HeroJoint() {
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

    const SEED = 20260730;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (isStatic) render(0);
    };

    // ---------- 幾何 ----------
    // 三個燕尾榫頭（上寬下窄的梯形，屬於下板、朝上突出）
    const geom = () => {
      const bw = w * 0.8;
      const bx = (w - bw) / 2;
      const yJoint = h * 0.58; // 榫肩線
      const th = Math.max(34, h * 0.11); // 榫頭高度
      const travel = h * 0.34; // 上板行程
      const tailBase = bw * 0.14;
      const flare = bw * 0.045;
      const centers = [0.24, 0.5, 0.76].map((f) => bx + bw * f);
      const bottomH = h * 0.32;
      const topH = h * 0.3;
      return { bw, bx, yJoint, th, travel, tailBase, flare, centers, bottomH, topH };
    };

    // 燕尾榫外形：沿上緣走（含榫頭），供板面路徑與縫線共用
    const traceTailEdge = (
      path: Path2D,
      g: ReturnType<typeof geom>,
      yBase: number,
      yTop: number,
      leftToRight: boolean,
    ) => {
      const pts: [number, number][] = [];
      for (const cx of g.centers) {
        const x1 = cx - g.tailBase / 2;
        const x2 = cx + g.tailBase / 2;
        pts.push([x1, yBase], [x1 - g.flare, yTop], [x2 + g.flare, yTop], [x2, yBase]);
      }
      const seq = leftToRight ? pts : pts.slice().reverse();
      for (const [x, y] of seq) path.lineTo(x, y);
    };

    // ---------- 木紋板面 ----------
    const paintBoard = (
      path: Path2D,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      kind: "maple" | "walnut",
      seedOffset: number,
    ) => {
      ctx.save();
      ctx.clip(path);
      const rand = mulberry32(SEED + seedOffset);
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      if (kind === "maple") {
        grad.addColorStop(0, "#e9d3a9");
        grad.addColorStop(1, "#ddc290");
      } else {
        grad.addColorStop(0, "#83603f");
        grad.addColorStop(1, "#6e4d30");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40);

      // 橫向木紋
      const n = Math.max(10, Math.floor((y1 - y0) / 9));
      for (let i = 0; i < n; i++) {
        const by = y0 + ((i + 0.5) / n) * (y1 - y0);
        const p1 = rand() * Math.PI * 2;
        const p2 = rand() * Math.PI * 2;
        const amp = 1.5 + rand() * 2.5;
        ctx.beginPath();
        for (let x = x0 - 10; x <= x1 + 10; x += 7) {
          const y = by + amp * Math.sin(x * 0.02 + p1) + Math.sin(x * 0.006 + p2) * 2.5;
          if (x <= x0 - 10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle =
          kind === "maple"
            ? `rgba(164, 116, 62, ${0.1 + rand() * 0.16})`
            : `rgba(38, 22, 10, ${0.12 + rand() * 0.2})`;
        ctx.lineWidth = 0.7 + rand() * 0.9;
        ctx.stroke();
      }
      ctx.restore();
    };

    // ---------- 狀態 ----------
    let locked = false;
    try {
      locked = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }
    let p = locked ? 1 : 0.04; // 咬合進度 0–1
    let target = locked ? 1 : REST_P;
    let dragging = false;
    let dragStartY = 0;
    let dragStartP = 0;
    let dragMoved = 0;
    let snapping = false;
    let snapFrom = 0;
    let snapT = 0; // 咬合動畫時間
    let snappedAt = -1; // effects 時間basis
    let animT = 0;
    const specks: Speck[] = [];
    let scrollBase = 0;

    const easeOutBack = (x: number) => {
      const c1 = 1.30158;
      return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    const triggerSnap = () => {
      if (locked || snapping) return;
      snapping = true;
      snapFrom = p;
      snapT = 0;
    };

    const completeSnap = () => {
      snapping = false;
      locked = true;
      p = 1;
      snappedAt = animT;
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      // 木屑迸出：每個榫頭頂角兩簇
      const g = geom();
      const rand = mulberry32(SEED + 99);
      for (const cx of g.centers) {
        for (const sx of [cx - g.tailBase / 2 - g.flare, cx + g.tailBase / 2 + g.flare]) {
          for (let i = 0; i < 3; i++) {
            specks.push({
              x: sx,
              y: g.yJoint - g.th,
              vx: (sx < cx ? -1 : 1) * (20 + rand() * 60),
              vy: -40 - rand() * 70,
              life: 0.9,
              size: 1.5 + rand() * 2,
            });
          }
        }
      }
    };

    // ---------- 繪製 ----------
    const render = (t: number) => {
      const g = geom();

      // 到位瞬間的鏡頭微震
      let shakeX = 0;
      let shakeY = 0;
      const sinceSnap = snappedAt >= 0 ? t - snappedAt : -1;
      if (sinceSnap >= 0 && sinceSnap < 0.35) {
        const decay = Math.exp(-sinceSnap * 12);
        shakeX = Math.sin(sinceSnap * 90) * 1.8 * decay;
        shakeY = Math.cos(sinceSnap * 70) * 1.2 * decay;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // 背景：暖光暈 + 年輪 motif 淡圈
      let bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.62);
      bg.addColorStop(0, "rgba(184, 129, 63, 0.1)");
      bg.addColorStop(1, "rgba(184, 129, 63, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 閒置浮動（未組裝時上板輕輕呼吸）
      const idle = locked || snapping || dragging ? 0 : Math.sin(t * 0.9) * 3;

      // 到位壓縮回彈（上板 y 縮放）
      let squash = 1;
      if (sinceSnap >= 0 && sinceSnap < 0.3) {
        squash = 1 - 0.03 * Math.sin((sinceSnap / 0.3) * Math.PI);
      }

      const yBottomEdge = g.yJoint - (1 - p) * g.travel + idle; // 上板底緣
      const yTopEdge = yBottomEdge - g.topH;

      // ---- 上板（淺楓木，底緣有燕尾承窩）----
      const topPath = new Path2D();
      topPath.moveTo(g.bx, yTopEdge);
      topPath.lineTo(g.bx + g.bw, yTopEdge);
      topPath.lineTo(g.bx + g.bw, yBottomEdge);
      {
        // 底緣由右往左，遇到承窩往上挖
        const pts: [number, number][] = [];
        for (const cx of [...g.centers].reverse()) {
          const x1 = cx + g.tailBase / 2;
          const x2 = cx - g.tailBase / 2;
          pts.push(
            [x1, yBottomEdge],
            [x1 + g.flare, yBottomEdge - g.th],
            [x2 - g.flare, yBottomEdge - g.th],
            [x2, yBottomEdge],
          );
        }
        for (const [x, y] of pts) topPath.lineTo(x, y);
        topPath.lineTo(g.bx, yBottomEdge);
      }
      topPath.closePath();

      ctx.save();
      ctx.translate(0, yBottomEdge * (1 - squash));
      ctx.scale(1, squash);

      paintBoard(topPath, g.bx, yTopEdge, g.bx + g.bw, yBottomEdge, "maple", 11);
      // 承窩內面：端面木色較深、上緣帶內陰影，讀起來是「挖進去」
      // （承窩是輪廓上的缺口，不能 clip 到板面路徑，否則畫不出來）
      for (const cx of g.centers) {
        const x1 = cx - g.tailBase / 2;
        const x2 = cx + g.tailBase / 2;
        const cav = new Path2D();
        cav.moveTo(x1, yBottomEdge);
        cav.lineTo(x1 - g.flare, yBottomEdge - g.th);
        cav.lineTo(x2 + g.flare, yBottomEdge - g.th);
        cav.lineTo(x2, yBottomEdge);
        cav.closePath();
        const cg = ctx.createLinearGradient(0, yBottomEdge - g.th, 0, yBottomEdge);
        cg.addColorStop(0, "#b99a6b");
        cg.addColorStop(0.35, "#cfb184");
        cg.addColorStop(1, "#d8bc8e");
        ctx.fillStyle = cg;
        ctx.fill(cav);
        ctx.strokeStyle = "rgba(110, 78, 42, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.stroke(cav);
      }

      ctx.strokeStyle = "rgba(96, 66, 36, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.stroke(topPath);
      // 上緣高光
      ctx.beginPath();
      ctx.moveTo(g.bx + 2, yTopEdge + 1.2);
      ctx.lineTo(g.bx + g.bw - 2, yTopEdge + 1.2);
      ctx.strokeStyle = "rgba(255, 246, 224, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ---- 上板投在下板上的柔影（越接近越淺）----
      const gap = (1 - p) * g.travel;
      const shAlpha = 0.16 * Math.max(0, 1 - gap / (g.travel * 0.9));
      if (shAlpha > 0.01 && !locked) {
        const sh = ctx.createLinearGradient(0, yBottomEdge, 0, yBottomEdge + 26);
        sh.addColorStop(0, `rgba(43, 33, 26, ${shAlpha})`);
        sh.addColorStop(1, "rgba(43, 33, 26, 0)");
        ctx.fillStyle = sh;
        ctx.fillRect(g.bx, yBottomEdge, g.bw, 26);
      }

      // ---- 下板（深胡桃，榫頭朝上）----
      const botPath = new Path2D();
      botPath.moveTo(g.bx, g.yJoint + g.bottomH);
      botPath.lineTo(g.bx, g.yJoint);
      {
        const first = g.centers[0] - g.tailBase / 2;
        botPath.lineTo(first, g.yJoint);
        traceTailEdge(botPath, g, g.yJoint, g.yJoint - g.th, true);
        botPath.lineTo(g.bx + g.bw, g.yJoint);
      }
      botPath.lineTo(g.bx + g.bw, g.yJoint + g.bottomH);
      botPath.closePath();

      paintBoard(botPath, g.bx, g.yJoint - g.th, g.bx + g.bw, g.yJoint + g.bottomH, "walnut", 23);
      ctx.strokeStyle = "rgba(30, 18, 8, 0.6)";
      ctx.lineWidth = 1.6;
      ctx.stroke(botPath);
      // 榫頭頂面高光
      for (const cx of g.centers) {
        ctx.beginPath();
        ctx.moveTo(cx - g.tailBase / 2 - g.flare + 2, g.yJoint - g.th + 1.2);
        ctx.lineTo(cx + g.tailBase / 2 + g.flare - 2, g.yJoint - g.th + 1.2);
        ctx.strokeStyle = "rgba(236, 217, 176, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ---- 咬合後：縫線 + 閃光 + 烙印 ----
      if (locked) {
        // 貼合縫線（細、沉穩）
        const seam = new Path2D();
        seam.moveTo(g.bx, g.yJoint);
        seam.lineTo(g.centers[0] - g.tailBase / 2, g.yJoint);
        traceTailEdge(seam, g, g.yJoint, g.yJoint - g.th, true);
        seam.lineTo(g.bx + g.bw, g.yJoint);
        ctx.strokeStyle = "rgba(40, 26, 14, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.stroke(seam);

        // 到位閃光：沿縫線的金色光走一遍後淡出
        if (sinceSnap >= 0 && sinceSnap < 0.6) {
          const fl = 1 - sinceSnap / 0.6;
          ctx.strokeStyle = `rgba(236, 200, 130, ${0.85 * fl})`;
          ctx.lineWidth = 2.6 * fl + 0.6;
          ctx.stroke(seam);
        }

        // 烙印「文山」
        const stampAge = sinceSnap >= 0 ? sinceSnap - 0.35 : 10; // 復訪直接顯示
        if (stampAge > 0) {
          const ap = Math.min(1, stampAge / 0.45);
          const scale = 1.18 - 0.18 * (1 - Math.pow(1 - ap, 3));
          const sx = g.bx + g.bw * 0.84;
          const sy = g.yJoint + g.bottomH * 0.52;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(scale, scale);
          ctx.globalAlpha = 0.72 * ap;
          ctx.strokeStyle = "#2e1c0d";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 22.5, 0, Math.PI * 2);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.fillStyle = "#2e1c0d";
          ctx.font = '600 17px "Noto Serif TC", "PingFang TC", serif';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("文山", 0, 1);
          ctx.restore();
        }
      }

      // 木屑
      for (let i = specks.length - 1; i >= 0; i--) {
        const s = specks[i];
        s.life -= 0.016;
        if (s.life <= 0) {
          specks.splice(i, 1);
          continue;
        }
        s.vy += 5;
        s.x += s.vx * 0.016;
        s.y += s.vy * 0.016;
        ctx.globalAlpha = Math.min(1, s.life * 1.6);
        ctx.fillStyle = "#c9a86e";
        ctx.fillRect(s.x, s.y, s.size, s.size * 0.7);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    // ---------- 事件 ----------
    const topBoardHit = (x: number, y: number) => {
      const g = geom();
      const yBottomEdge = g.yJoint - (1 - p) * g.travel;
      return x > g.bx && x < g.bx + g.bw && y > yBottomEdge - g.topH - 14 && y < yBottomEdge + 6;
    };

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (locked || snapping || isStatic) return;
      const pt = toLocal(e);
      if (!topBoardHit(pt.x, pt.y)) return;
      dragging = true;
      dragMoved = 0;
      dragStartY = pt.y;
      dragStartP = p;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      const pt = toLocal(e);
      if (dragging) {
        const g = geom();
        const dy = pt.y - dragStartY;
        dragMoved = Math.max(dragMoved, Math.abs(dy));
        p = Math.min(1, Math.max(0.04, dragStartP + dy / g.travel));
        if (p >= 0.92) {
          dragging = false;
          canvas.style.cursor = "grab";
          triggerSnap();
        }
      } else if (!locked && !isStatic) {
        canvas.style.cursor = topBoardHit(pt.x, pt.y) ? "grab" : "default";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) {
        // 視為點按：未組裝時輕點直接組給你看
        if (!locked && !snapping && !isStatic) {
          const pt = toLocal(e);
          if (pt.x > 0 && pt.x < w && pt.y > 0 && pt.y < h) triggerSnap();
        }
        return;
      }
      dragging = false;
      canvas.style.cursor = "grab";
      if (dragMoved < 6) {
        triggerSnap(); // 原地輕點
      } else if (p >= 0.72) {
        triggerSnap();
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", () => {
      dragging = false;
    });

    // 捲動也會讓它慢慢咬合（不拖曳的人捲下去就看得到）。
    // 以「進頁後實際捲動的距離」計算，避免瀏覽器還原捲動位置時一載入就誤觸咬合。
    const initialScroll = window.scrollY;
    const onScroll = () => {
      if (locked || snapping || isStatic) return;
      if (animT < 0.8) return;
      scrollBase = Math.min(1, Math.max(0, window.scrollY - initialScroll) / 340);
      const st = REST_P + scrollBase * (0.9 - REST_P);
      target = Math.max(REST_P, st);
      if (st >= 0.82) triggerSnap();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (isStatic) {
      // 靜態：直接呈現組裝完成
      locked = true;
      p = 1;
      snappedAt = -10;
      render(0);
      return () => {
        ro.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    }

    // ---------- 迴圈（畫面外暫停） ----------
    let raf = 0;
    let running = false;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      animT += dt;

      if (snapping) {
        snapT += dt;
        const dur = 0.32;
        const x = Math.min(1, snapT / dur);
        p = snapFrom + (1 - snapFrom) * easeOutBack(x);
        if (x >= 1) completeSnap();
      } else if (!dragging && !locked) {
        p += (target - p) * 0.06;
      }

      render(animT);
    };

    const io = new IntersectionObserver(
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

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  return (
    <div className="ws-hero__canvas ws-hero__canvas--joint" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
