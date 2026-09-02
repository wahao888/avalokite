"use client";

import { useMemo, useState } from "react";
import { ROAST_CURVE, ROAST_STAGES } from "../_data/knowledge";

/* ═══════════════════════════════════════════════════════════════
   烘焙曲線（首頁）

   為什麼首頁放這個而不是一張咖啡照：客戶沒有照片，而且這個站要說服的是
   「這裡的人真的懂烘豆」。一條標了回溫點、轉黃、一爆、發展期的豆溫曲線，
   對懂的人是暗號，對不懂的人是一堂三十秒的課——照片做不到這件事。

   曲線是示意值，不是王龍任何一鍋的真實紀錄（見 _data/knowledge.ts 的說明）。
   ═══════════════════════════════════════════════════════════════ */

const W = 560;
const H = 290;
const PAD = { t: 16, r: 16, b: 34, l: 38 };
const T_MAX = 10.6;
const Y_MIN = 80;
const Y_MAX = 215;

const px = (t: number) => PAD.l + (t / T_MAX) * (W - PAD.l - PAD.r);
const py = (temp: number) =>
  PAD.t + (1 - (temp - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD.t - PAD.b);

/**
 * Catmull-Rom 轉三次貝茲。
 * 直接連線的話回溫點會是一個折角，看起來像折線圖而不是一條真的豆溫曲線；
 * 而豆溫曲線的意義有一半在於它的「平滑程度」，折角會把話講錯。
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0]!.x.toFixed(2)},${pts[0]!.y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function RoastCurve() {
  const [active, setActive] = useState("first-crack");

  const { line, area } = useMemo(() => {
    const pts = ROAST_CURVE.map((p) => ({ x: px(p.t), y: py(p.temp) }));
    const d = smoothPath(pts);
    const base = H - PAD.b;
    return {
      line: d,
      area: `${d}L${pts[pts.length - 1]!.x.toFixed(2)},${base}L${pts[0]!.x.toFixed(2)},${base}Z`,
    };
  }, []);

  const stage = ROAST_STAGES.find((s) => s.key === active) ?? ROAST_STAGES[0]!;

  return (
    <figure className="rk-curve">
      <div className="rk-curve__head">
        <div>
          <span className="rk-eyebrow">Roast Profile</span>
          <strong style={{ fontSize: 17, fontWeight: 500 }}>一鍋淺焙，十分鐘</strong>
        </div>
        <span className="rk-eyebrow">豆溫 °C ／ 分鐘</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="rk-curve__plot" role="img" aria-label="淺焙豆溫曲線示意圖">
        {/* 格線與座標 */}
        <g className="rk-curve__grid">
          {[100, 130, 160, 190].map((t) => (
            <line key={t} x1={PAD.l} y1={py(t)} x2={W - PAD.r} y2={py(t)} />
          ))}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--rk-line)" />
        </g>
        <g className="rk-curve__axis">
          {[100, 130, 160, 190].map((t) => (
            <text key={t} x={PAD.l - 7} y={py(t) + 3} textAnchor="end">
              {t}
            </text>
          ))}
          {[0, 2, 4, 6, 8, 10].map((t) => (
            <text key={t} x={px(t)} y={H - PAD.b + 15} textAnchor="middle">
              {t}′
            </text>
          ))}
        </g>

        {/* 發展期（一爆到下豆）的區間底色 */}
        <rect
          x={px(8.5)}
          y={PAD.t}
          width={px(10) - px(8.5)}
          height={H - PAD.t - PAD.b}
          fill="color-mix(in srgb, var(--rk-ember) 8%, transparent)"
        />
        <text
          x={(px(8.5) + px(10)) / 2}
          y={PAD.t + 11}
          textAnchor="middle"
          fontFamily="var(--rk-mono)"
          fontSize="8"
          letterSpacing="0.1em"
          fill="var(--rk-ember)"
        >
          DTR 15%
        </text>

        <path className="rk-curve__fill" d={area} />
        <path className="rk-curve__line" d={line} style={{ ["--len" as string]: 1400 }} />

        {/* 階段標記。點了就把說明換掉 */}
        {ROAST_STAGES.map((s, i) => (
          <g
            key={s.key}
            className="rk-curve__dot"
            data-on={active === s.key ? "1" : undefined}
            style={{ animationDelay: `${1.4 + i * 0.12}s`, transformOrigin: `${px(s.t)}px ${py(s.temp)}px` }}
            onMouseEnter={() => setActive(s.key)}
            onClick={() => setActive(s.key)}
            role="button"
            tabIndex={0}
            aria-label={`${s.label}，${s.temp} 度`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActive(s.key);
              }
            }}
          >
            <circle
              className="hit"
              cx={px(s.t)}
              cy={py(s.temp)}
              r="7"
              fill="color-mix(in srgb, var(--rk-ember) 18%, transparent)"
            />
            <circle
              cx={px(s.t)}
              cy={py(s.temp)}
              r="3.4"
              fill={active === s.key ? "var(--rk-ember)" : "var(--rk-paper-2)"}
              stroke="var(--rk-ember)"
              strokeWidth="1.6"
            />
            {(s.key === "turning" || s.key === "first-crack" || s.key === "drop") && (
              <text
                x={px(s.t)}
                y={py(s.temp) - 13}
                textAnchor={s.key === "drop" ? "end" : "middle"}
              >
                {s.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <figcaption className="rk-curve__read">
        <h4>
          {stage.label}
          <em>{stage.labelEn}</em>
          <span className="rk-num rk-mute" style={{ fontSize: 12, marginLeft: "auto" }}>
            {stage.t.toFixed(1)}′ / {stage.temp}°C
          </span>
        </h4>
        <p>{stage.desc}</p>

        <div className="rk-curve__steps">
          {ROAST_STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={active === s.key}
              onClick={() => setActive(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </figcaption>
    </figure>
  );
}
