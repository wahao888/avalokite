"use client";

import { useEffect, useRef, useState } from "react";

// 原木斷面切片（three.js / WebGL）：
// 一根原木的斷面隨游標立體傾斜（視差）；點擊「鋸下」一片——
// 切片帶著舊斷面飛出、翻滾、淡出，原木與切片背面同時露出同一組新年輪
// （一刀切開的兩面紋理相同，這是真實木材的邏輯）。
// 年輪與樹皮貼圖皆為程式生成（canvas → CanvasTexture），每次切都不重樣。
// three.js 以 dynamic import 載入，只有這個 hero 版本會下載它。
// prefers-reduced-motion → 渲染單張靜態畫面，不動、不可切。

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 年輪斷面貼圖（1024²）----------
function makeRingCanvas(seed: number): HTMLCanvasElement {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);
  const cx = S / 2 + (rand() - 0.5) * S * 0.06;
  const cy = S / 2 + (rand() - 0.5) * S * 0.06;
  const maxR = S * 0.485;

  // 心材深、邊材淺的底色
  const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  base.addColorStop(0, "#8a5a34");
  base.addColorStop(0.45, "#b3854f");
  base.addColorStop(0.92, "#d8b482");
  base.addColorStop(1, "#c9a468");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  // 年輪：不規則、疏密與深淺交錯
  let r = maxR * 0.03;
  const rings: { r: number; wob: number[]; amp: number }[] = [];
  while (r < maxR * 0.96) {
    r += maxR * (0.008 + rand() * 0.022);
    rings.push({
      r,
      wob: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
      amp: 0.008 + rand() * 0.02,
    });
  }
  for (const ring of rings) {
    ctx.beginPath();
    for (let a = 0; a <= 120; a++) {
      const th = (a / 120) * Math.PI * 2;
      const rr =
        ring.r *
        (1 +
          ring.amp * Math.sin(th * 3 + ring.wob[0]) +
          ring.amp * 0.6 * Math.sin(th * 7 + ring.wob[1]) +
          ring.amp * 0.35 * Math.sin(th * 13 + ring.wob[2]));
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const dark = rand() < 0.22;
    ctx.strokeStyle = `rgba(84, 50, 26, ${dark ? 0.45 + rand() * 0.25 : 0.14 + rand() * 0.2})`;
    ctx.lineWidth = dark ? 2.2 + rand() * 2.4 : 0.9 + rand() * 1.4;
    ctx.stroke();
  }

  // 放射狀纖維（極淡）
  for (let i = 0; i < 110; i++) {
    const th = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(th) * maxR * 0.06, cy + Math.sin(th) * maxR * 0.06);
    ctx.lineTo(cx + Math.cos(th) * maxR * (0.85 + rand() * 0.12), cy + Math.sin(th) * maxR * (0.85 + rand() * 0.12));
    ctx.strokeStyle = `rgba(120, 82, 46, ${0.02 + rand() * 0.04})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 乾裂紋：由內向外、漸細、微彎
  const cracks = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < cracks; i++) {
    const th = rand() * Math.PI * 2;
    const len = maxR * (0.35 + rand() * 0.5);
    const bend = (rand() - 0.5) * 0.4;
    const wBase = 3 + rand() * 6;
    ctx.beginPath();
    const x0 = cx + Math.cos(th) * maxR * 0.05;
    const y0 = cy + Math.sin(th) * maxR * 0.05;
    const x1 = cx + Math.cos(th + bend * 0.5) * len * 0.6;
    const y1 = cy + Math.sin(th + bend * 0.5) * len * 0.6;
    const x2 = cx + Math.cos(th + bend) * len;
    const y2 = cy + Math.sin(th + bend) * len;
    ctx.moveTo(x0 + wBase * Math.cos(th + Math.PI / 2), y0 + wBase * Math.sin(th + Math.PI / 2));
    ctx.quadraticCurveTo(x1, y1, x2, y2);
    ctx.quadraticCurveTo(x1, y1, x0 + wBase * Math.cos(th - Math.PI / 2), y0 + wBase * Math.sin(th - Math.PI / 2));
    ctx.closePath();
    ctx.fillStyle = "rgba(46, 26, 12, 0.75)";
    ctx.fill();
  }

  // 小節疤 1–2 顆
  const knots = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < knots; i++) {
    const th = rand() * Math.PI * 2;
    const kr = maxR * (0.45 + rand() * 0.28);
    const kx = cx + Math.cos(th) * kr;
    const ky = cy + Math.sin(th) * kr;
    const kSize = maxR * (0.035 + rand() * 0.03);
    const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kSize * 1.6);
    kg.addColorStop(0, "rgba(52, 32, 16, 0.9)");
    kg.addColorStop(1, "rgba(52, 32, 16, 0)");
    ctx.fillStyle = kg;
    ctx.beginPath();
    ctx.arc(kx, ky, kSize * 1.6, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, kSize * k * 0.5, kSize * k * 0.38, th, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(60, 36, 18, ${0.5 - k * 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 細碎噪點
  for (let i = 0; i < 2600; i++) {
    const th = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * maxR;
    ctx.fillStyle = `rgba(70, 44, 22, ${0.02 + rand() * 0.05})`;
    ctx.fillRect(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, 1.4, 1.4);
  }

  // 樹皮邊緣：外圈深色 + 內緣鋸齒
  ctx.beginPath();
  for (let a = 0; a <= 140; a++) {
    const th = (a / 140) * Math.PI * 2;
    const rr = maxR * (0.965 + 0.02 * Math.sin(th * 9 + seed) + 0.012 * Math.sin(th * 23));
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = maxR * 0.07;
  ctx.strokeStyle = "#4a2f1d";
  ctx.stroke();

  return c;
}

// ---------- 樹皮貼圖（512²，貼在圓柱側面）----------
function makeBarkCanvas(seed: number): HTMLCanvasElement {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(seed);

  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, "#573a22");
  g.addColorStop(0.5, "#4a2f1d");
  g.addColorStop(1, "#573a22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // 縱向皮溝（沿木身方向 = 貼圖 y 向）
  for (let i = 0; i < 90; i++) {
    const x = rand() * S;
    const wob = rand() * Math.PI * 2;
    const light = rand() < 0.4;
    ctx.beginPath();
    for (let y = 0; y <= S; y += 16) {
      const xx = x + Math.sin(y * 0.02 + wob) * 6;
      if (y === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.strokeStyle = light ? `rgba(140, 100, 62, ${0.1 + rand() * 0.15})` : `rgba(24, 14, 6, ${0.15 + rand() * 0.3})`;
    ctx.lineWidth = 1.5 + rand() * 5;
    ctx.stroke();
  }
  // 橫向短裂
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12 + rand() * 28, y + (rand() - 0.5) * 8);
    ctx.strokeStyle = "rgba(20, 12, 5, 0.4)";
    ctx.lineWidth = 1 + rand() * 2;
    ctx.stroke();
  }
  return c;
}

export default function HeroLog() {
  const hostRef = useRef<HTMLDivElement>(null);
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
    const host = hostRef.current;
    if (!host) return;
    const isStatic = reduced === true;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import("three");
      if (disposed || !host) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
      camera.position.set(0, 0.15, 6.4);

      // 暖色打光：半球光鋪底 + 主方向光給斷面立體感
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b4c30, 1.15));
      const key = new THREE.DirectionalLight(0xffe8c4, 1.6);
      key.position.set(-3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb8813f, 0.5);
      rim.position.set(4, -2, -3);
      scene.add(rim);

      const texOf = (canvas: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
      };

      let texSeed = 20260801;
      const barkTex = texOf(makeBarkCanvas(texSeed));
      barkTex.wrapS = THREE.RepeatWrapping;
      barkTex.repeat.set(3, 1);
      let faceTex = texOf(makeRingCanvas(texSeed));

      const R = 1.55;
      const LOG_LEN = 4.2;
      const barkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95 });
      const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.82 });
      const backMat = new THREE.MeshStandardMaterial({ color: 0x3c2412, roughness: 1 });

      const logGeo = new THREE.CylinderGeometry(R, R * 1.03, LOG_LEN, 56, 1);
      const log = new THREE.Mesh(logGeo, [barkMat, faceMat, backMat]);
      log.rotation.x = Math.PI / 2; // 軸轉向 z，斷面朝鏡頭
      log.position.z = -LOG_LEN / 2 + 0.55;

      const group = new THREE.Group(); // 游標視差載體
      group.add(log);
      scene.add(group);
      const BASE_ROT = { x: 0.34, y: -0.52 };
      group.rotation.set(BASE_ROT.x, BASE_ROT.y, 0);

      // ---------- 切片與特效 ----------
      interface Slice {
        mesh: InstanceType<typeof THREE.Mesh>;
        mats: InstanceType<typeof THREE.MeshStandardMaterial>[];
        vel: InstanceType<typeof THREE.Vector3>;
        angVel: InstanceType<typeof THREE.Vector3>;
        age: number;
      }
      const slices: Slice[] = [];

      interface Dust {
        mesh: InstanceType<typeof THREE.Mesh>;
        mat: InstanceType<typeof THREE.MeshBasicMaterial>;
        vel: InstanceType<typeof THREE.Vector3>;
        age: number;
      }
      const dust: Dust[] = [];
      const dustGeo = new THREE.PlaneGeometry(0.055, 0.04);

      let flash: { mesh: InstanceType<typeof THREE.Mesh>; mat: InstanceType<typeof THREE.MeshBasicMaterial>; age: number } | null = null;
      let recoil = 0;

      const sliceGeo = new THREE.CylinderGeometry(R, R, 0.22, 56, 1);
      const frontZ = () => log.position.z + LOG_LEN / 2;

      const doSlice = () => {
        if (slices.length >= 4) return;
        texSeed += 1;
        const newTex = texOf(makeRingCanvas(texSeed));

        // 切片：正面 = 原斷面；背面 = 新斷面（同一刀的兩半紋理相同）
        const sBark = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95, transparent: true });
        const sFront = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.82, transparent: true });
        const sBack = new THREE.MeshStandardMaterial({ map: newTex, roughness: 0.82, transparent: true });
        const mesh = new THREE.Mesh(sliceGeo, [sBark, sFront, sBack]);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.z = frontZ() + 0.13;
        group.add(mesh);
        slices.push({
          mesh,
          mats: [sBark, sFront, sBack],
          vel: new THREE.Vector3(2.6 + Math.random() * 1.2, 1.6 + Math.random() * 0.8, 1.4),
          angVel: new THREE.Vector3((Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 3),
          age: 0,
        });

        // 原木露出新斷面
        faceMat.map = newTex;
        faceMat.needsUpdate = true;
        faceTex = newTex;

        // 鋸切閃光：斷面上一圈金光
        const fMat = new THREE.MeshBasicMaterial({
          color: 0xf0cb84,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fMesh = new THREE.Mesh(new THREE.RingGeometry(R * 0.2, R * 1.02, 48), fMat);
        fMesh.position.z = frontZ() + 0.02;
        group.add(fMesh);
        if (flash) {
          group.remove(flash.mesh);
          flash.mesh.geometry.dispose();
          flash.mat.dispose();
        }
        flash = { mesh: fMesh, mat: fMat, age: 0 };

        // 木屑
        for (let i = 0; i < 16; i++) {
          const mat = new THREE.MeshBasicMaterial({ color: 0xc9a86e, transparent: true });
          const m = new THREE.Mesh(dustGeo, mat);
          const th = Math.random() * Math.PI * 2;
          m.position.set(Math.cos(th) * R * 0.9, Math.sin(th) * R * 0.9, frontZ() + 0.1);
          group.add(m);
          dust.push({
            mesh: m,
            mat,
            vel: new THREE.Vector3(Math.cos(th) * (1 + Math.random()), Math.sin(th) * (1 + Math.random()) + 1, 0.8 + Math.random()),
            age: 0,
          });
        }

        recoil = 1; // 原木後座力
      };

      // ---------- 互動 ----------
      const pointer = { x: 0, y: 0, active: false };
      const onMove = (e: PointerEvent) => {
        const rect = host.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        pointer.active = true;
      };
      const onLeave = () => {
        pointer.active = false;
      };
      const onClick = () => {
        if (!isStatic) doSlice();
      };
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
      host.addEventListener("click", onClick);

      const resize = () => {
        const rect = host.getBoundingClientRect();
        renderer.setSize(rect.width, rect.height);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        if (isStatic) renderer.render(scene, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // ---------- 迴圈 ----------
      let raf = 0;
      let running = false;
      let last = performance.now();
      let t = 0;

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;

        // 視差傾斜（緩動）＋ 閒置慢轉
        const tx = BASE_ROT.x + (pointer.active ? pointer.y * 0.16 : Math.sin(t * 0.4) * 0.04);
        const ty = BASE_ROT.y + (pointer.active ? pointer.x * 0.26 : Math.cos(t * 0.3) * 0.06);
        group.rotation.x += (tx - group.rotation.x) * 0.06;
        group.rotation.y += (ty - group.rotation.y) * 0.06;

        // 後座力回彈
        if (recoil > 0.001) {
          recoil *= Math.exp(-dt * 7);
          log.position.z = -LOG_LEN / 2 + 0.55 - recoil * 0.16;
        }

        // 切片飛行
        for (let i = slices.length - 1; i >= 0; i--) {
          const s = slices[i];
          s.age += dt;
          s.vel.y -= 5.2 * dt;
          s.mesh.position.addScaledVector(s.vel, dt);
          s.mesh.rotation.x += s.angVel.x * dt;
          s.mesh.rotation.y += s.angVel.y * dt;
          s.mesh.rotation.z += s.angVel.z * dt;
          if (s.age > 0.55) {
            const o = Math.max(0, 1 - (s.age - 0.55) / 0.7);
            s.mats.forEach((m) => (m.opacity = o));
            if (o <= 0) {
              group.remove(s.mesh);
              s.mats.forEach((m) => {
                if (m.map && m.map !== barkTex) m.map.dispose();
                m.dispose();
              });
              slices.splice(i, 1);
            }
          }
        }

        // 閃光
        if (flash) {
          flash.age += dt;
          const p = flash.age / 0.3;
          if (p >= 1) {
            group.remove(flash.mesh);
            flash.mesh.geometry.dispose();
            flash.mat.dispose();
            flash = null;
          } else {
            flash.mat.opacity = 0.9 * (1 - p);
            flash.mesh.scale.setScalar(1 + p * 0.12);
          }
        }

        // 木屑
        for (let i = dust.length - 1; i >= 0; i--) {
          const d = dust[i];
          d.age += dt;
          d.vel.y -= 6 * dt;
          d.mesh.position.addScaledVector(d.vel, dt);
          d.mat.opacity = Math.max(0, 1 - d.age / 0.8);
          if (d.age > 0.8) {
            group.remove(d.mesh);
            d.mat.dispose();
            dust.splice(i, 1);
          }
        }

        renderer.render(scene, camera);
      };

      let io: IntersectionObserver | null = null;
      if (isStatic) {
        renderer.render(scene, camera);
      } else {
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
        io.observe(host);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        io?.disconnect();
        ro.disconnect();
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
        host.removeEventListener("click", onClick);
        renderer.dispose();
        logGeo.dispose();
        sliceGeo.dispose();
        dustGeo.dispose();
        [barkMat, faceMat, backMat].forEach((m) => m.dispose());
        barkTex.dispose();
        faceTex.dispose();
        host.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [reduced]);

  return <div ref={hostRef} className="ws-hero__canvas ws-hero__canvas--log" aria-hidden="true" />;
}
