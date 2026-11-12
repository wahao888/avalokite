// 工具箱：材質、幾何、緩動、貼圖文字、卡通角色。
// 整支片子的造型語言都在這裡定——圓角、霧面、低彩度的品牌色，加少量高彩度的點綴。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export { THREE };

export const C = {
  paper: 0xf0ebe3, cream: 0xe4dccf, wood: 0xa98467, walnut: 0x7a5c44, sage: 0x8a9a7b, moss: 0x5f7155,
  mossDeep: 0x3f4d39, ink: 0x2f2b26, green: 0x06c755, gold: 0xf2b84b, coral: 0xe8735a, white: 0xffffff,
  skin: 0xf7d6bd, blush: 0xf2a08f, grass: 0xa3bf8c, grassDark: 0x86a573, soil: 0x9a775b, soilDark: 0x7b5c46,
  roof: 0xc47f5e, glass: 0xbfe3f0, parcel: 0xdcb98e, sky: 0x8ec9ee, lilac: 0xb7a6d9, butter: 0xf5d98b,
  teal: 0x6fb7b0, rose: 0xe9a3a3, steel: 0x8f9aa3,
};

// ── 材質（同參數共用一份） ──
const mats = new Map();
export function M(color, o = {}) {
  const key = JSON.stringify([color, o]);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({
      color, roughness: o.r ?? 0.78, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
      transparent: o.o !== undefined, opacity: o.o ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.dw ?? true,
    }));
  }
  return mats.get(key);
}
/** 會被單獨改動（發光、透明度）的材質要自己一份，不能共用 */
export const Mown = (color, o = {}) => M(color, o).clone();

// ── 幾何 ──
export const box = (w, h, d, r = 0.08) => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
export const sph = (r, ws = 32, hs = 22) => new THREE.SphereGeometry(r, ws, hs);
export const cyl = (rt, rb, h, seg = 32) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 10, 28);

export function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = shadow;
  return m;
}
export function group(x = 0, y = 0, z = 0, ...kids) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  kids.forEach((k) => g.add(k));
  return g;
}

// ── 緩動（全部是 t 的純函數：同一個時間點永遠算出同一格畫面） ──
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
export const inOut = (u) => { u = clamp01(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
export const outCubic = (u) => 1 - Math.pow(1 - clamp01(u), 3);
export const outBack = (u, k = 1.70158) => { u = clamp01(u); return 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2); };
export const outElastic = (u) => { u = clamp01(u); if (u === 0 || u === 1) return u; return Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI) / 3) + 1; };
export const outBounce = (u) => {
  u = clamp01(u); const n = 7.5625, d = 2.75;
  if (u < 1 / d) return n * u * u;
  if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75;
  if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375;
  return n * (u -= 2.625 / d) * u + 0.984375;
};
/** t 從 t0 起、歷時 d 的進度 0→1 */
export const prog = (t, t0, d) => clamp01((t - t0) / d);
/** 「彈出來」：0→1 帶一點過衝，用在所有冒出來的東西上 */
export const pop = (t, t0, d = 0.55) => outBack(prog(t, t0, d));
/** 固定的偽亂數：粒子、紙花的散佈每次渲染都一樣 */
export const rnd = (i, salt = 0) => { const x = Math.sin(i * 127.1 + salt * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x); };
export const setScale = (o, s) => { o.visible = s > 0.001; o.scale.setScalar(Math.max(s, 0.0001)); };

// ── 畫在 canvas 上的貼圖（看板、螢幕、對話泡泡、標籤） ──
export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const FONT = '"PingFang TC","Noto Sans TC",sans-serif';
const SERIF = '"Noto Serif TC","Songti TC",serif';
export const font = (px, weight = 700, serif = false) => `${weight} ${px}px ${serif ? SERIF : FONT}`;

/** 年輪標誌，畫在 canvas 上 */
export function drawLogo(g, cx, cy, s, col = { a: "#A98467", b: "#8A9A7B", c: "#5F7155" }) {
  g.save(); g.translate(cx, cy); g.lineCap = "round";
  const ring = (r, dash, rot, color, lw) => {
    g.save(); g.rotate(rot * Math.PI / 180); g.setLineDash(dash.map((d) => d * s)); g.lineWidth = lw * s; g.strokeStyle = color;
    g.beginPath(); g.arc(0, 0, r * s, 0, Math.PI * 2); g.stroke(); g.restore();
  };
  ring(30, [118, 18, 40, 12], -30, col.a, 2.4); ring(23, [58, 14, 52, 20], 40, col.b, 2.4); ring(16, [64, 12, 18, 8], 160, col.a, 2.4);
  g.setLineDash([]); g.strokeStyle = col.c; g.lineWidth = 4.4 * s;
  g.beginPath(); g.moveTo(0, -13 * s); g.lineTo(-9 * s, 13 * s); g.moveTo(0, -13 * s); g.lineTo(9 * s, 13 * s); g.stroke();
  g.beginPath(); g.moveTo(-5.2 * s, 4.5 * s); g.quadraticCurveTo(0, 1.5 * s, 5.2 * s, 4.5 * s); g.stroke();
  g.restore();
}

/** 永遠面向鏡頭的標籤／泡泡。h 是在場景裡的高度 */
export function sprite(w, h, draw, worldH = 0.6) {
  const m = new THREE.SpriteMaterial({ map: canvasTex(w, h, draw), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.userData.base = [worldH * w / h, worldH];
  s.scale.set(s.userData.base[0], s.userData.base[1], 1);
  return s;
}
export function setSprite(s, k, opacity = 1) {
  s.visible = k > 0.001 && opacity > 0.001;
  s.scale.set(s.userData.base[0] * Math.max(k, 1e-4), s.userData.base[1] * Math.max(k, 1e-4), 1);
  s.material.opacity = opacity;
}
/** 對話泡泡：side 決定尾巴朝左還是朝右 */
export function bubble(text, { bg = "#ffffff", fg = "#1b1b1b", side = "left", worldH = 0.62 } = {}) {
  const px = 64, pad = 44;
  const probe = document.createElement("canvas").getContext("2d"); probe.font = font(px, 600);
  const w = Math.ceil(probe.measureText(text).width) + pad * 2, h = 150;
  return sprite(w + 20, h + 40, (g) => {
    g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 18; g.shadowOffsetY = 8;
    g.fillStyle = bg; rrect(g, 10, 6, w, h - 24, 54); g.fill();
    g.beginPath();
    if (side === "left") { g.moveTo(54, h - 26); g.lineTo(30, h + 6); g.lineTo(104, h - 26); }
    else { g.moveTo(w - 34, h - 26); g.lineTo(w - 10, h + 6); g.lineTo(w - 84, h - 26); }
    g.closePath(); g.fill();
    g.shadowColor = "transparent"; g.fillStyle = fg; g.font = font(px, 600); g.textBaseline = "middle";
    g.fillText(text, 10 + pad, 6 + (h - 24) / 2 + 3);
  }, worldH);
}
/** 圓角標籤：小字、圖示、數字用 */
export function tag(text, { bg = "#2F2B26", fg = "#ffffff", worldH = 0.5, px = 72, weight = 700, serif = false } = {}) {
  const pad = 46;
  const probe = document.createElement("canvas").getContext("2d"); probe.font = font(px, weight, serif);
  const w = Math.ceil(probe.measureText(text).width) + pad * 2, h = px + 64;
  return sprite(w + 24, h + 30, (g) => {
    g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 16; g.shadowOffsetY = 8;
    g.fillStyle = bg; rrect(g, 12, 8, w, h, h / 2); g.fill();
    g.shadowColor = "transparent"; g.fillStyle = fg; g.font = font(px, weight, serif); g.textBaseline = "middle";
    g.fillText(text, 12 + pad, 8 + h / 2 + 4);
  }, worldH);
}

// ── 角色 ──
// 兩頭身、沒有手臂（手是飄在身體旁邊的球）、表情只靠眼睛和嘴角。
// 這種造型的好處是每個動作都可以用「跳一下」「手舉高」「頭歪一邊」講完，不需要骨架。
export function makeChar(o = {}) {
  const g = new THREE.Group(), inner = new THREE.Group();
  g.add(inner);
  const body = mesh(cap(0.3, 0.26), M(o.body ?? C.moss, { r: 0.85 }), 0, 0.5, 0);
  const head = new THREE.Group(); head.position.set(0, 1.12, 0);
  head.add(mesh(sph(0.39, 40, 28), M(o.skin ?? C.skin, { r: 0.7 })));
  const eyeMat = M(0x2a2420, { r: 0.35 });
  const eyeL = mesh(sph(0.062, 16, 12), eyeMat, -0.145, 0.02, 0.345, false), eyeR = mesh(sph(0.062, 16, 12), eyeMat, 0.145, 0.02, 0.345, false);
  eyeL.scale.z = eyeR.scale.z = 0.55;
  const glint = M(0xffffff, { r: 0.2, e: 0xffffff, ei: 0.6 });
  eyeL.add(mesh(sph(0.02, 8, 6), glint, 0.022, 0.026, 0.05, false)); eyeR.add(mesh(sph(0.02, 8, 6), glint, 0.022, 0.026, 0.05, false));
  const cheekMat = M(C.blush, { r: 0.9, o: 0.75 });
  const chL = mesh(sph(0.07, 16, 12), cheekMat, -0.25, -0.08, 0.27, false), chR = mesh(sph(0.07, 16, 12), cheekMat, 0.25, -0.08, 0.27, false);
  chL.scale.set(1, 0.6, 0.4); chR.scale.set(1, 0.6, 0.4);
  // 嘴：半個圓環，轉 180 度就從微笑變成嘴角下垂
  const mouth = mesh(new THREE.TorusGeometry(0.07, 0.017, 8, 20, Math.PI), M(0x7a3b32, { r: 0.6 }), 0, -0.1, 0.36, false);
  mouth.rotation.z = Math.PI;
  head.add(eyeL, eyeR, chL, chR, mouth);

  if (o.hat === "helmet") {            // 阿瓦羅團隊：苔綠工程帽
    const dome = mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(o.hatColor ?? C.mossDeep, { r: 0.45 }), 0, 0.06, 0);
    const brim = mesh(cyl(0.5, 0.5, 0.05, 36), M(o.hatColor ?? C.mossDeep, { r: 0.45 }), 0, 0.07, 0.06);
    brim.scale.z = 1.12;
    const band = mesh(new THREE.TorusGeometry(0.415, 0.035, 10, 40), M(C.paper, { r: 0.5 }), 0, 0.12, 0); band.rotation.x = Math.PI / 2;
    const badge = mesh(sph(0.075, 16, 12), M(C.gold, { r: 0.4, m: 0.3 }), 0, 0.27, 0.36); badge.scale.z = 0.45;
    head.add(dome, brim, band, badge);
  } else if (o.hat === "hair") {       // 老闆、客人：一球瀏海＋後腦勺
    const hc = M(o.hair ?? 0x4a3728, { r: 0.9 });
    const top = mesh(new THREE.SphereGeometry(0.41, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.46), hc, 0, 0.02, -0.02);
    const tuft = mesh(sph(0.13, 16, 12), hc, 0.1, 0.4, 0.06);
    head.add(top, tuft);
    if (o.bun) head.add(mesh(sph(0.15, 16, 12), hc, 0, 0.36, -0.26));
  } else if (o.hat === "beanie") {
    const hc = M(o.hair ?? C.coral, { r: 0.95 });
    head.add(mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hc, 0, 0.03, 0),
      mesh(new THREE.TorusGeometry(0.4, 0.06, 10, 32), hc, 0, 0.05, 0), mesh(sph(0.09, 12, 10), M(C.paper), 0, 0.47, 0));
    head.children[head.children.length - 2].rotation.x = Math.PI / 2;
  }
  if (o.apron) {
    const a = mesh(box(0.42, 0.44, 0.1, 0.05), M(o.apron, { r: 0.9 }), 0, 0.44, 0.26);
    const pocket = mesh(box(0.18, 0.12, 0.04, 0.02), M(C.paper, { r: 0.9 }), 0, 0.4, 0.32);
    inner.add(a, pocket);
  }
  const handMat = M(o.skin ?? C.skin, { r: 0.7 });
  const handL = mesh(sph(0.105, 18, 14), handMat, -0.42, 0.56, 0.06), handR = mesh(sph(0.105, 18, 14), handMat, 0.42, 0.56, 0.06);
  const footMat = M(o.shoe ?? C.walnut, { r: 0.8 });
  const footL = mesh(sph(0.13, 16, 12), footMat, -0.15, 0.07, 0.05), footR = mesh(sph(0.13, 16, 12), footMat, 0.15, 0.07, 0.05);
  footL.scale.set(1, 0.6, 1.35); footR.scale.set(1, 0.6, 1.35);
  inner.add(body, head, handL, handR, footL, footR);
  g.userData = { inner, body, head, eyeL, eyeR, mouth, handL, handR, footL, footR, seed: o.seed ?? 0 };
  return g;
}

/**
 * 擺姿勢。全部欄位都可省略：
 *   hop     離地高度      squash  擠壓（<1 扁、>1 拉長）
 *   mood    1 開心 … -1 沮喪（嘴角、低頭）
 *   cheer   0–1 雙手舉高   wave    0–1 右手揮手      walk  步行相位（弧度）
 *   sleep   閉眼          look    頭左右轉（弧度）
 */
export function pose(c, t, p = {}) {
  const u = c.userData, { hop = 0, squash = 1, mood = 1, cheer = 0, wave = 0, walk = null, sleep = false, look = 0, nod = 0 } = p;
  u.inner.position.y = hop;
  const sq = squash, inv = 1 / Math.sqrt(Math.max(sq, 0.2));
  u.inner.scale.set(inv, sq, inv);
  // 眨眼：每個角色週期錯開
  const ph = (t * 0.31 + u.seed * 0.37) % 1;
  const blink = sleep ? 0.12 : ph > 0.955 ? 0.12 : 1;
  u.eyeL.scale.y = u.eyeR.scale.y = blink * (mood > 0.6 && cheer > 0.5 ? 0.8 : 1);
  u.mouth.rotation.z = mood >= 0 ? Math.PI : 0;
  u.mouth.position.y = mood >= 0 ? -0.1 : -0.17;
  u.mouth.scale.setScalar(0.75 + 0.45 * Math.abs(mood));
  u.head.rotation.x = (mood < 0 ? 0.32 * -mood : 0) + nod + (sleep ? 0.3 : 0);
  u.head.rotation.y = look;
  u.head.rotation.z = sleep ? 0.18 : Math.sin(t * 1.3 + u.seed) * 0.03;
  // 手
  const sw = walk === null ? 0 : Math.sin(walk);
  const idle = Math.sin(t * 2 + u.seed * 2) * 0.015;
  const lx = -0.42, rx = 0.42;
  u.handL.position.set(lx - cheer * 0.1, 0.56 + idle + cheer * 0.72 + (mood < 0 ? -0.08 : 0), 0.06 + sw * 0.2);
  const wv = wave > 0 ? Math.sin(t * 11) * 0.12 * wave : 0;
  u.handR.position.set(rx + cheer * 0.1 + wave * 0.12 + wv, 0.56 + idle + Math.max(cheer * 0.72, wave * 0.78) + (mood < 0 ? -0.08 : 0), 0.06 - sw * 0.2);
  u.footL.position.z = 0.05 + sw * 0.16; u.footR.position.z = 0.05 - sw * 0.16;
  u.footL.position.y = 0.07 + Math.max(0, sw) * 0.08; u.footR.position.y = 0.07 + Math.max(0, -sw) * 0.08;
}

/** 沿著一串點走，回傳位置與面向。u 是 0–1 的整段進度 */
export function along(pts, u) {
  u = clamp01(u);
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]); segs.push(d); total += d; }
  let d = u * total, i = 0;
  while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
  const k = segs[i] ? d / segs[i] : 0, a = pts[i], b = pts[i + 1];
  return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), z: lerp(a[2], b[2], k), ry: Math.atan2(b[0] - a[0], b[2] - a[2]), dist: u * total };
}
