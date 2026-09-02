/* ═══════════════════════════════════════════════════════════════
   研磨粗細對照

   「中細研磨，砂糖顆粒大小」這種描述，對沒磨過豆子的人是沒有畫面的。
   這裡把五個粗細直接畫成顆粒——同一塊面積、同樣的密度演算法，
   只有顆粒大小在變，所以並排時的差距是真的可以用眼睛量的。

   顆粒位置用固定種子的偽亂數算出來（不是 Math.random）：
   伺服器與瀏覽器必須算出同一組座標，否則 hydration 會不一致。
   ═══════════════════════════════════════════════════════════════ */

const S = 84; // 每一塊取樣區的邊長

/** mulberry32。要的是「看起來隨機但每次都一樣」 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 用「格子＋抖動」鋪點，不用純亂數：純亂數會結塊也會留白，
 * 看起來像雜訊而不是磨出來的粉。
 */
function particles(r: number, seed: number) {
  const cell = r * 2.5;
  const cols = Math.max(1, Math.floor(S / cell));
  const rand = rng(seed);
  const out: { x: number; y: number; r: number; a: number }[] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < cols; j++) {
      const jx = (rand() - 0.5) * cell * 0.75;
      const jy = (rand() - 0.5) * cell * 0.75;
      const x = (i + 0.5) * cell + jx + (S - cols * cell) / 2;
      const y = (j + 0.5) * cell + jy + (S - cols * cell) / 2;
      if (x < r || y < r || x > S - r || y > S - r) continue;
      out.push({
        x,
        y,
        // 顆粒本來就不會一樣大，±25% 讓它不像印花
        r: r * (0.75 + rand() * 0.5),
        a: rand() * 360,
      });
    }
  }
  return out;
}

type Level = {
  key: string;
  zh: string;
  en: string;
  /** 顆粒半徑，單位是取樣區的座標。比例貼近實際粒徑差 */
  r: number;
  /** 拿什麼比喻 */
  like: string;
  /** 對應的沖煮方式 */
  method: string;
};

const LEVELS: Level[] = [
  { key: "coarse", zh: "粗", en: "Coarse", r: 5.2, like: "粗砂糖", method: "法式濾壓壺" },
  { key: "medium", zh: "中", en: "Medium", r: 3.6, like: "細砂糖", method: "聰明濾杯" },
  { key: "medium-fine", zh: "中細", en: "Medium–Fine", r: 2.5, like: "砂糖與鹽之間", method: "手沖 / 愛樂壓" },
  { key: "fine", zh: "細", en: "Fine", r: 1.7, like: "食鹽", method: "摩卡壺" },
  { key: "extra-fine", zh: "極細", en: "Extra Fine", r: 1.0, like: "麵粉", method: "義式濃縮" },
];

export default function GrindScale() {
  return (
    <div className="rk-grind">
      {LEVELS.map((l, i) => (
        <figure key={l.key} className="rk-grind__cell">
          <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={`${l.zh}研磨的顆粒示意`}>
            <rect width={S} height={S} fill="var(--rk-paper-2)" />
            {particles(l.r, 1000 + i * 977).map((p, k) => (
              <ellipse
                key={k}
                cx={p.x}
                cy={p.y}
                rx={p.r}
                ry={p.r * 0.78}
                transform={`rotate(${p.a.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                fill="var(--rk-ember)"
                opacity={0.62}
              />
            ))}
          </svg>
          <figcaption>
            <b>
              {l.zh}
              <em>{l.en}</em>
            </b>
            <span>像{l.like}</span>
            <span className="rk-grind__method">{l.method}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
