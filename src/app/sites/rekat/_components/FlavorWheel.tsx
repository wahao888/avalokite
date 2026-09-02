"use client";

import { useState } from "react";
import Link from "next/link";
import { FAMILY, FAMILY_ORDER, wheelLabel, type FamilyKey } from "../_data/flavor-wheel";
import { RK } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   互動式咖啡風味輪

   結構照 SCA 2016 版：九個家族在內圈，第二層描述詞在外圈，由內而外收斂。
   點內圈會把該家族推到前面、其餘淡出，右側同步換成說明與該家族的描述詞。

   為什麼自己畫而不是放官方那張圖：
   ① 官方圖是版權素材，不能直接放客戶的商業網站。
   ② 一張 PNG 點不了。這個站要的是「點下去，然後看到我們有哪幾支豆子是這個調性」，
      那必須是資料驅動的 SVG。
   ③ 螢光色系的原圖放在和紙底上會炸掉，配色需要重來一次（見 _data/flavor-wheel.ts）。
   ═══════════════════════════════════════════════════════════════ */

const CX = 150;
const CY = 150;
const R_HUB = 46;
const R_MID = 94;
const R_OUT = 132;

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

/** 環狀扇形（甜甜圈的一片） */
function sector(r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = pt(r1, a0);
  const [x2, y2] = pt(r1, a1);
  const [x3, y3] = pt(r0, a1);
  const [x4, y4] = pt(r0, a0);
  return [
    `M${x1.toFixed(2)},${y1.toFixed(2)}`,
    `A${r1},${r1} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
    `L${x3.toFixed(2)},${y3.toFixed(2)}`,
    `A${r0},${r0} 0 ${large} 0 ${x4.toFixed(2)},${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** 徑向文字：右半邊往外讀，左半邊翻過來，否則會上下顛倒 */
function radialText(r: number, deg: number) {
  const [x, y] = pt(r, deg);
  const flip = deg > 180;
  const rot = flip ? deg + 90 : deg - 90;
  return {
    x,
    y,
    transform: `rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`,
    anchor: (flip ? "end" : "start") as "start" | "end",
  };
}

const SEG = 360 / FAMILY_ORDER.length;

export default function FlavorWheel({
  /** 每個家族有幾支豆子，用來在說明面板下方導到豆單 */
  counts,
}: {
  counts?: Partial<Record<FamilyKey, number>>;
}) {
  const [active, setActive] = useState<FamilyKey | null>(null);
  const fam = active ? FAMILY[active] : null;
  const n = active ? counts?.[active] ?? 0 : 0;

  return (
    <div className="rk-wheel" data-active={active ?? undefined}>
      <svg
        viewBox="0 0 300 300"
        className="rk-wheel__svg"
        role="group"
        aria-label="咖啡風味輪，點選家族看說明"
      >
        {FAMILY_ORDER.map((key, i) => {
          const f = FAMILY[key];
          const a0 = i * SEG + 0.7;
          const a1 = (i + 1) * SEG - 0.7;
          const mid = (a0 + a1) / 2;
          // 起點離內緣 7px 而非 10px：最長的家族標「堅果可可」在 10px 時
          // 會超出色帶外緣約 2px（量過），往內收 3px 就整排都進得去。
          const lab = radialText(R_HUB + 7, mid);
          const on = active === key;

          return (
            <g
              key={key}
              className="rk-wheel__seg"
              data-on={on ? "1" : undefined}
              onClick={() => setActive(on ? null : key)}
              onMouseEnter={() => setActive(key)}
              role="button"
              tabIndex={0}
              aria-label={`${f.zh} ${f.en}`}
              aria-pressed={on}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(on ? null : key);
                }
              }}
            >
              {/* 內圈：家族 */}
              <path d={sector(R_HUB, R_MID, a0, a1)} fill={f.color} />
              <text
                className="rk-wheel__lab"
                x={lab.x}
                y={lab.y}
                transform={lab.transform}
                textAnchor={lab.anchor}
                dominantBaseline="middle"
              >
                {wheelLabel(f)}
              </text>

              {/* 外圈：第二層描述詞，各自均分家族的角度 */}
              {f.children.map((c, j) => {
                const w = (a1 - a0) / f.children.length;
                const b0 = a0 + j * w + 0.4;
                const b1 = a0 + (j + 1) * w - 0.4;
                const cl = radialText(R_MID + 6, (b0 + b1) / 2);
                return (
                  <g key={c.en}>
                    <path
                      d={sector(R_MID, R_OUT, b0, b1)}
                      fill={f.color}
                      opacity={0.2 + j * 0.07}
                      stroke="var(--rk-paper)"
                      strokeWidth="0.6"
                    />
                    <text
                      className="rk-wheel__lab2"
                      x={cl.x}
                      y={cl.y}
                      transform={cl.transform}
                      textAnchor={cl.anchor}
                      dominantBaseline="middle"
                    >
                      {wheelLabel(c)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 中心：圓心留白是這張圖能呼吸的關鍵 */}
        <circle cx={CX} cy={CY} r={R_HUB - 2} fill="var(--rk-paper)" />
        <circle cx={CX} cy={CY} r={R_HUB - 2} fill="none" stroke="var(--rk-line)" strokeWidth="1" />
        <text className="rk-wheel__hub" x={CX} y={CY - 6} textAnchor="middle">
          Flavor
        </text>
        <text className="rk-wheel__hub" x={CX} y={CY + 10} textAnchor="middle">
          Wheel
        </text>
      </svg>

      <div className="rk-wheel__panel" style={{ ["--fam" as string]: fam?.color ?? "var(--rk-line)" }}>
        {fam ? (
          <>
            <h3>
              {fam.zh}
              <em>{fam.en}</em>
            </h3>
            <p>{fam.gist}</p>
            <div className="rk-wheel__subs">
              {fam.children.map((c) => (
                <span key={c.en}>
                  {c.zh}
                  <i style={{ fontStyle: "normal", color: "var(--rk-mute)", marginLeft: 6, fontSize: 10 }}>
                    {c.en}
                  </i>
                </span>
              ))}
            </div>
            {n > 0 && (
              <Link
                className="rk-arrow"
                href={`${RK}/beans?family=${fam.key}`}
                style={{ marginTop: 22, display: "inline-flex", color: "var(--rk-accent)" }}
              >
                本期有 {n} 支{fam.zh}調性
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                  <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </Link>
            )}
          </>
        ) : (
          <>
            <h3 style={{ color: "var(--rk-mute)" }}>由內而外，一層一層收斂</h3>
            <p>
              風味輪的讀法是從圓心往外走：先落在一個大方向（果香？花香？堅果？），
              再往外找到更精確的詞。杯測師寫的每一張表都是這樣長出來的。
            </p>
            <p className="rk-mute" style={{ fontSize: 13 }}>
              把游標移到任何一片上，或直接點下去。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
