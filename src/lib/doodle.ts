// 手繪插圖產生器：內頁的圖示與插圖都由這裡用程式畫出來，沒有任何圖檔。
//
// 做法跟 docs/marketing/handdrawn-reel 那支短片同一套：
//   1. 線不準——端點有誤差、中間有一點弓，而且同一條線描兩次
//   2. 圓收不攏——半徑忽大忽小，收尾多畫一小段蓋過起點
//   3. 顏色塗到線外面——色塊故意跟外框錯開，大面積用斜線一條一條塗
//
// 不用 SVG 位移濾鏡來抖線：濾鏡在部分 WebKit 上會以 1x 解析度輸出，
// 手機上圖示會糊。這裡直接算出抖過的路徑，任何瀏覽器都是清晰的向量。
//
// 亂數是帶種子的，所以每次算出來的圖都一樣（伺服器重繪不會跳）。
// 這個檔案刻意不 import 任何東西，方便單獨用 node 產出對照表檢查圖形。

export type Pt = readonly [number, number];

/** 各圖層：色塊（兩種底色）→ 斜線 → 墨線 → 強調色線 → 實心點 → 星芒 */
export type Kind = "fill" | "fill2" | "hatch" | "ink" | "accent" | "solid" | "spark";
export const KINDS: Kind[] = ["fill", "fill2", "hatch", "ink", "accent", "solid", "spark"];

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => String(Math.round(n * 10) / 10);

export class Pen {
  parts: Record<Kind, string> = { fill: "", fill2: "", hatch: "", ink: "", accent: "", solid: "", spark: "" };
  private rnd: () => number;
  private j: number;
  private kind: Kind = "ink";
  private tf: (p: Pt) => Pt = (p) => p;

  constructor(seed: number, jitter = 0.7) {
    this.rnd = mulberry32(seed);
    this.j = jitter;
  }

  /** 換筆：之後畫的線都進這個圖層 */
  as(kind: Kind) {
    this.kind = kind;
    return this;
  }

  /** 之後畫的東西都繞 (cx, cy) 轉 deg 度；不帶參數＝轉回來 */
  turn(deg = 0, cx = 0, cy = 0) {
    if (!deg) {
      this.tf = (p) => p;
      return this;
    }
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    this.tf = ([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
    return this;
  }

  private n(a = 1) {
    return (this.rnd() * 2 - 1) * a * this.j;
  }
  private s(p: Pt) {
    const [x, y] = this.tf(p);
    return `${f(x)} ${f(y)}`;
  }
  private put(d: string, kind: Kind = this.kind) {
    this.parts[kind] += d;
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, passes = 2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const k = Math.min(1, len / 12); // 短線不要抖得比線本身還大
    let d = "";
    for (let i = 0; i < passes; i++) {
      const o1 = this.rnd() * 0.9 * this.j * k;
      const o2 = this.rnd() * 0.9 * this.j * k;
      const a: Pt = [x1 - ux * o1 + this.n(0.6 * k), y1 - uy * o1 + this.n(0.6 * k)];
      const b: Pt = [x2 + ux * o2 + this.n(0.6 * k), y2 + uy * o2 + this.n(0.6 * k)];
      const bow = this.n(Math.min(len * 0.035, 1.4));
      const m: Pt = [(x1 + x2) / 2 - uy * bow, (y1 + y2) / 2 + ux * bow];
      d += `M${this.s(a)}Q${this.s(m)} ${this.s(b)}`;
    }
    return this.put(d);
  }

  poly(pts: Pt[], closed = false, passes = 2) {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      this.line(a[0], a[1], b[0], b[1], passes);
    }
    return this;
  }

  rect(x: number, y: number, w: number, h: number, passes = 2) {
    return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, passes);
  }

  // Catmull-Rom 轉三次貝茲：讓曲線平滑地通過每一個點
  private spline(pts: Pt[]) {
    let d = `M${this.s(pts[0])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${this.s(c1)} ${this.s(c2)} ${this.s(p2)}`;
    }
    return d;
  }

  curve(pts: Pt[], passes = 2) {
    let d = "";
    for (let i = 0; i < passes; i++) {
      d += this.spline(pts.map(([x, y]) => [x + this.n(0.5), y + this.n(0.5)] as Pt));
    }
    return this.put(d);
  }

  private ring(cx: number, cy: number, rx: number, ry: number, wobble: number, turns: number): Pt[] {
    const n = Math.max(8, Math.round(6 + Math.sqrt(rx + ry) * 2));
    const steps = Math.ceil(n * turns);
    const a0 = this.rnd() * Math.PI * 2;
    const pts: Pt[] = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / n;
      const a = a0 + t * Math.PI * 2;
      const r = 1 + this.n(wobble) + (turns > 1 ? 0.035 * t : 0);
      pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return pts;
  }

  ellipse(cx: number, cy: number, rx: number, ry = rx) {
    return this.put(this.spline(this.ring(cx, cy, rx, ry, 0.045, 1.12)));
  }

  /** 色塊：故意不規則，通常會跟外框錯開幾個單位 */
  blob(cx: number, cy: number, rx: number, ry = rx, kind: Kind = "fill") {
    const pts = this.ring(cx, cy, rx, ry, 0.11, 1);
    pts[pts.length - 1] = pts[0];
    return this.put(this.spline(pts) + "Z", kind);
  }

  fillPoly(pts: Pt[], kind: Kind = "fill") {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${this.s([p[0] + this.n(1.1), p[1] + this.n(1.1)])}`).join("");
    return this.put(d + "Z", kind);
  }

  /** 斜線塗色（矩形範圍） */
  hatch(x: number, y: number, w: number, h: number, gap = 4.5) {
    let d = "";
    for (let k = gap * 0.7; k < w + h - gap * 0.3; k += gap) {
      const a: Pt = [x + Math.max(0, k - h) + this.n(0.5), y + Math.min(k, h) + this.n(0.5)];
      const b: Pt = [x + Math.min(k, w) + this.n(0.5), y + Math.max(0, k - w) + this.n(0.5)];
      d += `M${this.s(a)}L${this.s(b)}`;
    }
    return this.put(d, "hatch");
  }

  /** 斜線塗色（圓形範圍） */
  hatchO(cx: number, cy: number, r: number, gap = 4.5) {
    const q = Math.SQRT1_2;
    let d = "";
    for (let o = -r + gap * 0.6; o < r; o += gap) {
      const hc = Math.sqrt(r * r - o * o) * 0.94;
      const mx = cx + o * q;
      const my = cy + o * q;
      const a: Pt = [mx - hc * q + this.n(0.5), my + hc * q + this.n(0.5)];
      const b: Pt = [mx + hc * q + this.n(0.5), my - hc * q + this.n(0.5)];
      d += `M${this.s(a)}L${this.s(b)}`;
    }
    return this.put(d, "hatch");
  }

  dot(cx: number, cy: number, r = 1.3) {
    const [x, y] = this.tf([cx, cy]);
    return this.put(`M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`, "solid");
  }

  /** 四角星芒 */
  star(cx: number, cy: number, r: number, kind: Kind = "spark") {
    const k = r * 0.2;
    const P = (x: number, y: number) => this.s([x, y]);
    return this.put(
      `M${P(cx, cy - r)}Q${P(cx + k, cy - k)} ${P(cx + r, cy)}Q${P(cx + k, cy + k)} ${P(cx, cy + r)}` +
        `Q${P(cx - k, cy + k)} ${P(cx - r, cy)}Q${P(cx - k, cy - k)} ${P(cx, cy - r)}Z`,
      kind,
    );
  }

  arrow(x1: number, y1: number, x2: number, y2: number, head = 6) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    this.line(x1, y1, x2, y2);
    for (const s of [-1, 1]) {
      const b = a + Math.PI + s * 0.62;
      this.line(x2, y2, x2 + Math.cos(b) * head, y2 + Math.sin(b) * head, 1);
    }
    return this;
  }

  /** 虛線軌跡：每一段只畫中間那一截 */
  trail(pts: Pt[]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      this.line(ax + (bx - ax) * 0.22, ay + (by - ay) * 0.22, ax + (bx - ax) * 0.78, ay + (by - ay) * 0.78, 1);
    }
    return this;
  }
}

function gear(p: Pen, cx: number, cy: number, ro: number, ri: number, teeth: number, hole: number) {
  const step = (Math.PI * 2) / teeth;
  const at = (a: number, r: number): Pt => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(at(a - step * 0.3, ri), at(a - step * 0.17, ro), at(a + step * 0.17, ro), at(a + step * 0.3, ri));
  }
  p.poly(pts, true, 1).ellipse(cx, cy, hole);
}

interface Def {
  w: number;
  h: number;
  seed: number;
  jitter?: number;
  draw: (p: Pen) => void;
}

const icon = (seed: number, draw: (p: Pen) => void): Def => ({ w: 64, h: 64, seed, draw });

const DEFS = {
  // ── 服務 ──
  browser: icon(11, (p) => {
    p.fillPoly([[12, 17], [60, 16], [59, 55], [13, 56]]);
    p.rect(7, 11, 50, 40).line(7, 21, 57, 21);
    p.dot(12.5, 16).dot(17, 16).dot(21.5, 16);
    p.hatch(13, 27, 17, 17, 4).rect(13, 27, 17, 17, 1);
    p.line(35, 29, 51, 29, 1).line(35, 35, 51, 35, 1);
    p.as("accent").rect(35, 40, 12, 5, 1);
  }),
  cart: icon(23, (p) => {
    p.blob(35, 31, 17, 9);
    p.poly([[5, 13], [13, 14], [20, 39], [47, 39], [53, 20], [15, 20]]);
    p.ellipse(25, 47, 3.2).ellipse(43, 47, 3.2);
    p.line(24, 26, 47, 26, 1).line(26, 32, 46, 32, 1);
    p.as("accent").rect(28, 5, 13, 11, 1).line(34.5, 5, 34.5, 16, 1);
  }),
  chat: icon(31, (p) => {
    p.blob(35, 30, 22, 15);
    p.curve([[10, 26], [14, 14], [32, 10], [50, 14], [54, 27], [48, 39], [32, 43], [22, 42], [12, 53], [14, 38], [10, 26]], 1);
    p.dot(24, 27, 1.8).dot(32, 27, 1.8).dot(40, 27, 1.8);
    p.star(55, 8, 6).star(60, 21, 3);
  }),
  gears: icon(47, (p) => {
    p.blob(27, 28, 15);
    gear(p, 25, 26, 17, 12.5, 8, 5);
    p.as("accent");
    gear(p, 47, 46, 10.5, 7.2, 6, 3);
  }),
  search: icon(53, (p) => {
    p.blob(29, 29, 14);
    p.ellipse(26, 26, 16);
    p.line(38, 38, 55, 55).line(40, 36.5, 57, 53.5, 1);
    p.star(26, 26, 8);
  }),
  shield: icon(61, (p) => {
    p.fillPoly([[18, 18], [35, 12], [54, 18], [52, 36], [36, 59], [20, 38]]);
    p.line(14, 14, 32, 8).line(32, 8, 50, 14);
    p.curve([[50, 14], [50.5, 30], [44, 45], [32, 56]]).curve([[14, 14], [13.5, 30], [20, 45], [32, 56]]);
    p.as("accent").poly([[23, 30], [30, 38], [42, 22]]);
  }),
  pulse: icon(71, (p) => {
    p.fillPoly([[18, 17], [54, 16], [53, 60], [18, 61]]);
    p.rect(14, 12, 36, 45).rect(25, 7, 14, 9, 1);
    p.as("accent").poly([[18, 33], [24, 33], [28, 24], [33, 43], [37, 29], [40, 33], [46, 33]], false, 1);
    p.as("ink").line(20, 46, 37, 46, 1).line(20, 51, 31, 51, 1);
  }),
  card: icon(83, (p) => {
    p.fillPoly([[11, 23], [61, 22], [60, 53], [12, 54]]);
    p.rect(7, 18, 50, 31);
    p.hatch(7, 25, 50, 6, 3.2).line(7, 25, 57, 25, 1).line(7, 31, 57, 31, 1);
    p.rect(13, 36, 9, 7, 1).line(28, 42, 49, 42, 1);
    p.as("accent").ellipse(50, 11, 7).line(50, 7.5, 50, 14.5, 1);
  }),

  // ── 保證 ──
  tag: icon(97, (p) => {
    p.fillPoly([[14, 35], [28, 20], [58, 20], [58, 52], [28, 52]]);
    p.poly([[9, 31], [23, 15], [54, 15], [54, 47], [23, 47]], true);
    p.ellipse(22, 31, 2.6);
    p.as("accent").line(32, 26, 46, 26).line(32, 36, 46, 36);
  }),
  key: icon(101, (p) => {
    p.blob(23, 25, 10);
    p.ellipse(20, 22, 10.5).ellipse(20, 22, 3.4);
    p.line(27.5, 29.5, 53, 52).line(45.9, 45.7, 49.9, 41.2, 1).line(51, 50.2, 55, 45.7, 1);
    p.star(47, 14, 5.5);
  }),
  signpost: icon(113, (p) => {
    p.line(31, 8, 31, 57);
    p.fillPoly([[19, 18], [45, 17], [53, 25], [46, 32], [19, 33]]);
    p.poly([[15, 14], [42, 14], [50, 21.5], [42, 29], [15, 29]], true);
    p.as("accent").poly([[48, 35], [22, 35], [15, 41.5], [22, 48], [48, 48]], true, 1);
    p.as("ink").line(20, 57, 43, 57);
  }),
  bandage: icon(127, (p) => {
    p.turn(-35, 32, 32);
    p.fillPoly([[12, 27], [58, 27], [58, 45], [12, 45]]);
    p.rect(9, 23, 46, 18).line(24, 23, 24, 41, 1).line(40, 23, 40, 41, 1);
    p.dot(29, 29, 1).dot(35, 29, 1).dot(29, 35, 1).dot(35, 35, 1).dot(32, 32, 1);
    p.turn();
    p.star(53, 12, 5).star(11, 51, 3.5);
  }),

  // ── 條件 ──
  calendar: icon(131, (p) => {
    p.fillPoly([[14, 19], [58, 18], [57, 58], [14, 59]]);
    p.rect(10, 14, 44, 40).line(10, 24, 54, 24).line(20, 9, 20, 18).line(44, 9, 44, 18);
    for (const [x, y] of [[16, 30], [28.5, 30], [41, 30], [16, 42], [28.5, 42]] as Pt[]) p.rect(x, y, 7, 6, 1);
    p.as("accent").ellipse(44.5, 45, 6);
  }),
  exit: icon(149, (p) => {
    p.fillPoly([[17, 14], [41, 13], [41, 57], [17, 57]]);
    p.poly([[13, 55], [13, 9], [37, 9], [37, 55]]).line(6, 55, 45, 55);
    p.dot(32, 33, 1.5);
    p.as("accent").arrow(42, 32, 59, 32, 7);
  }),
  code: icon(157, (p) => {
    p.blob(33, 33, 20, 13);
    p.poly([[22, 19], [9, 32], [22, 45]]).poly([[42, 19], [55, 32], [42, 45]]);
    p.as("accent").line(37, 14, 27, 50);
  }),
  stopwatch: icon(163, (p) => {
    p.blob(34, 38, 17);
    p.ellipse(32, 36, 18).line(32, 18, 32, 11).line(26.5, 10, 37.5, 10).line(45.5, 22.5, 49.5, 18.5, 1);
    p.as("accent").line(32, 36, 32, 24).line(32, 36, 41, 40);
    p.dot(32, 36, 1.6);
  }),

  // ── 公司資料 ──
  building: icon(173, (p) => {
    p.fillPoly([[20, 16], [52, 15], [52, 59], [20, 59]]);
    p.rect(16, 11, 32, 45).line(6, 56, 58, 56);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p.rect(21 + c * 8.5, 17 + r * 9, 5, 5.5, 1);
    p.as("accent").rect(28, 45, 8, 11, 1);
  }),
  seal: icon(181, (p) => {
    p.fillPoly([[16, 14], [50, 13], [50, 57], [16, 58]]);
    p.rect(12, 9, 34, 45).line(18, 18, 40, 18, 1).line(18, 25, 40, 25, 1).line(18, 32, 30, 32, 1);
    p.as("accent").ellipse(42, 45, 9.5).ellipse(42, 45, 6);
    p.star(42, 45, 3.6);
  }),
  pin: icon(191, (p) => {
    p.blob(34, 27, 13, 14);
    p.curve([[32, 56], [24, 44], [17, 33], [17, 23], [23, 13], [32, 10], [41, 13], [47, 23], [47, 33], [40, 44], [32, 56]], 1);
    p.ellipse(32, 25, 5.5);
    p.as("accent").curve([[19, 57], [26, 60], [38, 60], [45, 57]], 1);
  }),
  phone: icon(193, (p) => {
    p.fillPoly([[24, 12], [48, 11], [48, 59], [24, 59]]);
    p.rect(20, 7, 24, 49).line(28, 12.5, 36, 12.5, 1).ellipse(32, 50, 2.2);
    p.as("accent").curve([[49, 19], [53, 24], [52, 31]], 1).curve([[53, 13], [59.5, 22], [57, 34]], 1);
  }),
  mail: icon(197, (p) => {
    p.fillPoly([[12, 21], [60, 20], [59, 52], [12, 53]]);
    p.rect(8, 16, 48, 32).poly([[8, 16], [32, 35], [56, 16]]);
    p.as("accent").line(9, 47, 24, 33, 1).line(55, 47, 40, 33, 1);
  }),

  // ── 流程 ──
  folder: icon(211, (p) => {
    p.fillPoly([[12, 29], [60, 28], [59, 54], [12, 55]]);
    p.poly([[30, 24], [30, 9], [50, 9], [50, 24]]).line(34, 14, 46, 14, 1).line(34, 19, 46, 19, 1);
    p.poly([[8, 18], [22, 18], [27, 24], [56, 24], [56, 50], [8, 50]], true);
    p.as("accent").poly([[16, 37], [20, 41], [27, 33]], false, 1).line(32, 38, 48, 38, 1);
  }),
  pencil: icon(223, (p) => {
    p.turn(135, 32, 30);
    p.fillPoly([[14, 28], [48, 28], [48, 40], [14, 40]]);
    p.rect(12, 25, 34, 10).poly([[46, 25], [57, 30], [46, 35]]).line(18, 25, 18, 35, 1).line(53, 28.2, 53, 31.8, 1);
    p.turn();
    p.as("accent").curve([[22, 55], [29, 59], [35, 53], [42, 58], [50, 54]], 1);
  }),
  rocket: icon(227, (p) => {
    p.turn(32, 32, 32);
    p.blob(34, 27, 10, 16);
    p.curve([[32, 5], [24, 15], [22, 30], [24, 42]]).curve([[32, 5], [40, 15], [42, 30], [40, 42]]).line(24, 42, 40, 42);
    p.ellipse(32, 23, 4.5);
    p.poly([[23, 31], [14, 45], [24, 41]]).poly([[41, 31], [50, 45], [40, 41]]);
    p.as("accent").curve([[27, 45], [28, 53], [32, 60], [36, 53], [37, 45]], 1);
    p.turn();
    p.star(11, 14, 4.5).star(55, 50, 3);
  }),
  check: icon(233, (p) => {
    p.blob(34, 34, 18);
    p.ellipse(32, 32, 20);
    p.as("accent").poly([[21, 32], [29, 41], [44, 23]]);
  }),

  calc: icon(239, (p) => {
    p.fillPoly([[18, 12], [52, 11], [52, 59], [18, 59]]);
    p.rect(14, 7, 34, 49).hatch(19, 12, 24, 11, 3.6).rect(19, 12, 24, 11, 1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) p.rect(19 + c * 8.5, 28 + r * 8.5, 5.5, 5.5, 1);
    p.as("accent").line(48, 40, 58, 40, 1).line(48, 45, 58, 45, 1);
  }),
  handoff: icon(243, (p) => {
    p.blob(17, 44, 11, 9).blob(47, 44, 11, 9, "fill2");
    p.ellipse(17, 26, 7).curve([[5, 55], [7, 41], [17, 37], [27, 41], [29, 55]], 1);
    p.ellipse(47, 26, 7).curve([[35, 55], [37, 41], [47, 37], [57, 41], [59, 55]], 1);
    p.as("accent").curve([[22, 13], [32, 6], [42, 13]], 1).poly([[37.5, 9.5], [42, 13], [37, 15]], false, 1);
  }),

  // ── 版面小物 ──
  /** 步驟之間的箭頭 */
  arrow: {
    w: 48, h: 24, seed: 241,
    draw: (p) => {
      p.as("accent").curve([[3, 14], [14, 9], [28, 15], [43, 11]], 1).poly([[36, 5], [44, 11], [37, 18]], false, 1);
    },
  },
  /** 標題底下的麥克筆線；橫向會被拉伸到跟文字一樣寬 */
  underline: {
    w: 200, h: 12, seed: 251, jitter: 1,
    draw: (p) => {
      p.as("accent").curve([[3, 7], [45, 4.5], [98, 8], [150, 4.5], [197, 6.5]], 2);
    },
  },

  // ── 大插圖 ──
  /** 服務頁：筆電上的網站、手機裡的對話、齒輪與盆栽 */
  heroServices: {
    w: 380, h: 270, seed: 307, jitter: 1,
    draw: (p) => {
      // 筆電
      p.fillPoly([[78, 62], [262, 58], [262, 180], [80, 182]]);
      p.rect(70, 52, 184, 122).line(70, 70, 254, 70);
      p.dot(80, 61, 2).dot(88, 61, 2).dot(96, 61, 2);
      p.hatch(84, 84, 62, 50, 7).rect(84, 84, 62, 50, 1);
      p.line(160, 90, 238, 90, 1).line(160, 103, 238, 103, 1).line(160, 116, 214, 116, 1);
      p.line(84, 148, 238, 148, 1).line(84, 160, 190, 160, 1);
      p.poly([[52, 174], [272, 174], [290, 196], [34, 196]], true);
      p.line(140, 185, 184, 185, 1);
      p.as("accent").rect(160, 126, 42, 14, 1);
      // 游標
      p.as("ink").poly([[222, 128], [222, 150], [228, 145], [233, 156], [238, 153], [233, 143], [241, 142]], true, 1);
      // 手機與對話
      p.fillPoly([[306, 104], [366, 102], [366, 214], [306, 216]], "fill2");
      p.rect(298, 94, 62, 112).line(318, 102, 340, 102, 1);
      p.as("accent").rect(306, 114, 34, 15, 1);
      p.as("ink").rect(318, 136, 34, 15, 1).hatch(318, 136, 34, 15, 5);
      p.as("accent").rect(306, 158, 26, 15, 1);
      p.dot(313, 187, 1.6).dot(320, 187, 1.6).dot(327, 187, 1.6);
      // 齒輪
      p.as("ink");
      gear(p, 300, 44, 24, 17.5, 9, 7);
      p.as("accent");
      gear(p, 342, 66, 13, 9, 6, 3.6);
      // 盆栽
      p.as("ink").poly([[4, 166], [44, 166], [38, 196], [10, 196]], true);
      p.curve([[24, 166], [22, 140], [12, 122], [4, 116]]).curve([[4, 116], [16, 118], [22, 132], [23, 148]], 1);
      p.curve([[25, 166], [28, 138], [40, 122], [50, 118]]).curve([[50, 118], [40, 126], [32, 140], [28, 156]], 1);
      p.curve([[24, 150], [24, 124], [26, 108], [28, 98]], 1);
      p.blob(20, 136, 16, 20, "fill");
      // 桌面
      p.line(0, 197, 378, 197).line(18, 206, 150, 206, 1).line(210, 208, 350, 208, 1);
      p.star(46, 60, 9).star(26, 84, 5).star(270, 30, 5);
    },
  },
  /** 零元啟動頁：火箭升空，雲與星 */
  heroLaunch: {
    w: 380, h: 300, seed: 331, jitter: 1,
    draw: (p) => {
      // 軌跡
      p.as("accent").trail([[38, 270], [70, 250], [100, 228], [128, 204], [152, 180], [172, 158]]);
      p.as("ink");
      // 火箭（先畫直的，再整個轉 42 度）
      p.turn(42, 220, 130);
      p.blob(226, 122, 34, 62);
      p.curve([[220, 34], [192, 70], [184, 124], [192, 176]]).curve([[220, 34], [248, 70], [256, 124], [248, 176]]);
      p.line(192, 176, 248, 176).line(196, 162, 244, 162, 1);
      p.ellipse(220, 98, 15).ellipse(220, 98, 9.5);
      p.poly([[187, 130], [158, 186], [192, 172]]).poly([[253, 130], [282, 186], [248, 172]]);
      p.hatch(203, 122, 34, 30, 6);
      p.as("accent").curve([[202, 180], [205, 210], [220, 240], [235, 210], [238, 180]]);
      p.curve([[212, 182], [214, 200], [220, 214], [226, 200], [228, 182]], 1);
      p.turn();
      // 雲
      p.as("ink").curve([[236, 262], [240, 244], [262, 240], [270, 252], [282, 238], [308, 240], [314, 256], [332, 256], [338, 272], [236, 272], [236, 262]], 1);
      p.curve([[16, 92], [20, 78], [38, 76], [44, 86], [54, 74], [76, 78], [80, 92], [92, 94], [94, 104], [16, 104], [16, 92]], 1);
      p.blob(288, 262, 44, 12, "fill2");
      // 星
      p.star(318, 54, 12).star(346, 104, 6).star(120, 40, 8).star(66, 150, 5).star(300, 170, 5);
      p.dot(150, 76, 2).dot(350, 30, 2).dot(96, 196, 2).dot(262, 204, 2);
    },
  },
  /** 首頁 AI 客服：深夜裡的手機，客人問、機器人答 */
  heroChat: {
    w: 380, h: 280, seed: 367, jitter: 1,
    draw: (p) => {
      // 月亮與星
      p.as("accent").curve([[318, 22], [296, 30], [290, 54], [302, 74], [326, 80], [344, 70]], 2);
      p.curve([[318, 22], [312, 36], [314, 54], [326, 66], [344, 70]], 1);
      p.star(262, 30, 9).star(352, 120, 6).star(84, 40, 7);
      p.dot(286, 106, 2).dot(30, 96, 2).dot(236, 64, 2);
      // 手機
      p.as("ink").fillPoly([[128, 30], [256, 28], [256, 266], [130, 268]], "fill2");
      p.rect(118, 18, 128, 240).line(118, 42, 246, 42, 1).line(118, 232, 246, 232, 1);
      p.line(166, 30, 198, 30, 1).ellipse(182, 245, 6);
      // 對話：客人（右、斜線）→ 機器人（左、綠框）→ 客人 → 打字中
      p.rect(170, 56, 62, 26, 1).hatch(170, 56, 62, 26, 5).poly([[222, 82], [230, 92], [214, 82]], false, 1);
      p.as("accent").rect(132, 98, 80, 40, 1).line(140, 110, 200, 110, 1).line(140, 122, 184, 122, 1);
      p.poly([[142, 138], [134, 148], [152, 138]], false, 1);
      p.as("ink").rect(184, 156, 48, 22, 1).hatch(184, 156, 48, 22, 5);
      p.as("accent").rect(132, 194, 42, 22, 1);
      p.dot(143, 205, 2).dot(153, 205, 2).dot(163, 205, 2);
      // 機器人
      p.as("ink").blob(312, 186, 30, 32, "fill");
      p.rect(286, 160, 48, 38).line(310, 160, 310, 146, 1).ellipse(310, 142, 4);
      p.dot(300, 176, 2.6).dot(320, 176, 2.6);
      p.as("accent").curve([[299, 186], [310, 192], [321, 186]], 1);
      p.as("ink").rect(292, 202, 36, 34, 1).line(292, 214, 272, 196, 1).line(328, 214, 346, 228, 1);
      p.line(300, 236, 300, 252, 1).line(320, 236, 320, 252, 1);
      // 時鐘：11 點
      p.ellipse(56, 196, 30).dot(56, 196, 2);
      p.as("accent").line(56, 196, 49, 178).line(56, 196, 56, 174);
      p.as("ink").line(56, 170, 56, 174, 1).line(82, 196, 78, 196, 1).line(56, 222, 56, 218, 1).line(30, 196, 34, 196, 1);
      // 地面
      p.line(8, 260, 372, 260).line(20, 270, 110, 270, 1).line(266, 270, 360, 270, 1);
    },
  },
  /** 關於頁：辦公樓、招牌上的 A、樹與太陽 */
  heroAbout: {
    w: 380, h: 280, seed: 353, jitter: 1,
    draw: (p) => {
      // 太陽
      p.as("accent").ellipse(326, 52, 22);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.3;
        p.line(326 + Math.cos(a) * 31, 52 + Math.sin(a) * 31, 326 + Math.cos(a) * 41, 52 + Math.sin(a) * 41, 1);
      }
      // 主樓
      p.as("ink").fillPoly([[128, 64], [258, 60], [258, 250], [130, 252]]);
      p.rect(118, 52, 132, 192).line(110, 52, 258, 52).line(118, 84, 250, 84, 1);
      // 招牌 A
      p.as("accent").poly([[170, 78], [184, 58], [198, 78]], false, 2).line(176, 70, 192, 70, 1);
      p.as("ink");
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = 132 + c * 38;
          const y = 96 + r * 36;
          p.rect(x, y, 26, 22, 1);
          if ((r + c) % 2 === 0) p.hatch(x, y, 26, 22, 6);
        }
      }
      p.as("accent").rect(170, 206, 30, 38, 1).line(185, 206, 185, 244, 1);
      // 旁邊的矮樓
      p.as("ink").rect(46, 138, 72, 106).line(40, 138, 122, 138, 1);
      p.fillPoly([[52, 146], [124, 144], [124, 250], [54, 250]], "fill2");
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) p.rect(58 + c * 28, 152 + r * 28, 18, 16, 1);
      // 樹
      p.line(296, 244, 296, 196).line(296, 214, 308, 202, 1);
      p.blob(300, 172, 30, 30, "fill");
      p.curve([[296, 200], [270, 196], [262, 172], [276, 154], [290, 140], [314, 142], [326, 158], [336, 178], [322, 198], [296, 200]], 1);
      // 地面
      p.line(8, 245, 372, 245).line(30, 256, 150, 256, 1).line(216, 258, 340, 258, 1);
      p.star(74, 84, 8).star(40, 108, 4.5).star(360, 122, 5);
    },
  },
} satisfies Record<string, Def>;

export type DoodleName = keyof typeof DEFS;

export interface DoodleArt {
  w: number;
  h: number;
  parts: Record<Kind, string>;
}

function render(def: Def): DoodleArt {
  const pen = new Pen(def.seed, def.jitter);
  def.draw(pen);
  return { w: def.w, h: def.h, parts: pen.parts };
}

export const DOODLES = Object.fromEntries(
  Object.entries(DEFS).map(([name, def]) => [name, render(def)]),
) as Record<DoodleName, DoodleArt>;
