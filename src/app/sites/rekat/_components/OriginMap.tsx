"use client";

import { useState } from "react";
import Link from "next/link";
import { usedCountries, type CountryCode } from "../_data/beans";
import { RK } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   產地地圖

   不是照著真實輪廓描的地圖，是手繪的示意圖——只畫到「認得出是哪一塊」為止。

   視野裁在西經 162° 到東經 115°、南北緯 30° 之間，也就是咖啡帶本身。
   這個範圍是被豆單決定的：最西邊是夏威夷可娜（西經 156°），
   最東邊是蘇門答臘林東（東經 99°），中間九個產地全部落在這條帶子上。
   東邊界刻意留到 115° 而不是切在 108°——否則蘇門答臘會被畫布右緣切掉半截。
   換豆單若出現這個範圍外的產地（例如巴布亞紐幾內亞），要一併調整 LON_MIN/LON_MAX。

   伺服器 CSP 是 img-src 'self'，本來就不能用外部地圖圖磚；
   而 Google Maps 的 iframe 也會被 CSP 擋掉（沒有 frame-src，fallback 到 default-src 'self'）。
   ═══════════════════════════════════════════════════════════════ */

const LON_MIN = -162;
const LON_MAX = 115;
const W = 900;
const H = 300;

// 等距圓柱投影，裁切到咖啡帶
const SX = W / (LON_MAX - LON_MIN);
const proj = (lon: number, lat: number): [number, number] => [
  (lon - LON_MIN) * SX,
  (30 - lat) * 5,
];
const path = (pts: [number, number][]) =>
  pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${proj(p[0], p[1]).map((n) => n.toFixed(1)).join(",")}`)
    .join("") + "Z";

// 手繪等級的輪廓：夠認得出來就好
const MEXICO: [number, number][] = [
  [-118, 30], [-106, 30], [-97, 25], [-94, 18], [-91, 19], [-87, 21], [-86, 18],
  [-89, 16], [-84, 15], [-83, 9], [-79, 9], [-77, 7.5], [-80, 7], [-83, 8],
  [-85, 11], [-88, 14], [-92, 15], [-96, 16], [-101, 18], [-106, 23], [-110, 25], [-114, 28],
];
const SOUTH_AM: [number, number][] = [
  [-78, 9], [-75, 11], [-71, 12], [-64, 11], [-60, 8], [-52, 5], [-50, 0], [-44, -2],
  [-38, -4], [-35, -6], [-38, -13], [-39, -18], [-44, -23], [-48, -25], [-53, -30],
  [-62, -30], [-70, -30], [-71, -24], [-70, -18], [-72, -14], [-77, -6], [-81, -5],
  [-80, 0], [-78, 2], [-77, 6],
];
const AFRICA: [number, number][] = [
  [-17, 15], [-16, 20], [-13, 26], [-6, 30], [10, 30], [20, 30], [32, 30], [35, 24],
  [38, 18], [43, 12], [48, 9], [51, 11], [45, 3], [41, -2], [40, -10], [35, -18],
  [33, -25], [28, -30], [20, -30], [16, -25], [12, -17], [9, -1], [9, 4], [3, 6],
  [-4, 5], [-8, 4], [-13, 9], [-16, 12],
];
const ARABIA: [number, number][] = [
  [35, 30], [44, 30], [52, 25], [57, 23], [59, 22], [55, 17], [48, 13], [43, 12], [38, 17], [35, 24],
];
const INDIA: [number, number][] = [
  [68, 23], [70, 20], [73, 16], [75, 12], [77, 8], [80, 10], [80, 13], [83, 17],
  [87, 21], [89, 22], [89, 26], [85, 26], [78, 28], [73, 25],
];
const INDOCHINA: [number, number][] = [
  [92, 22], [94, 17], [97, 16], [98, 13], [100, 8], [102, 3], [104, 1.5],
  [104, 6], [106, 10], [108, 12], [109, 16], [107, 20], [105, 22], [101, 22], [97, 24], [93, 25],
];
const BORNEO: [number, number][] = [
  [109, 2], [113, 3.5], [115, 5], [115, -1], [114, -3.5], [110, -3.5], [109, -1],
];
// 蘇門答臘：西北—東南走向的長條島，曼特寧就長在中段的林東
const SUMATRA: [number, number][] = [
  [95.3, 5.6], [98.5, 3.8], [101.5, 1.0], [104, -1.8], [106, -5.5],
  [105.2, -6.1], [103, -3.6], [100.3, -0.8], [97.3, 2.2], [94.8, 4.9],
];
const JAVA: [number, number][] = [[105.4, -5.9], [108, -6.2], [108, -7.6], [105.5, -7.1]];
const ISLANDS: [number, number][][] = [
  [[-84, 22], [-80, 23], [-76.5, 20], [-79, 20], [-82, 21]], // 古巴
  [[-74, 19.5], [-69, 19], [-68, 18], [-72, 17.8]], //          伊斯帕尼奧拉
  [[-78.4, 18.5], [-76.2, 18.2], [-76.8, 17.6], [-78.2, 17.8]], // 牙買加
  [[43, -12], [50, -16], [49, -25], [45, -25], [43, -18]], //   馬達加斯加
  SUMATRA,
  JAVA,
  BORNEO,
];
/** 夏威夷群島太小，畫成多邊形會變成看不出形狀的碎屑，改用圓點 */
const HAWAII: [number, number, number][] = [
  [-159.5, 22.1, 2.2],
  [-158, 21.5, 2.0],
  [-156.4, 20.8, 2.4],
  [-155.5, 19.6, 3.4],
];

/** 九個產地的座標。取該國咖啡產區的重心，不是首都。 */
/**
 * 九個產地的座標。取該國咖啡產區的重心，不是首都。
 *
 * nudge 的水平量至少要 16：光暈圈半徑是 11，剛好用 11 的話標籤會貼著圈邊，
 * 支數那個數字看起來像黏在釘子上（實際畫出來確認過）。
 */
const PINS: Record<CountryCode, { lon: number; lat: number; nudge: [number, number] }> = {
  US: { lon: -155.9, lat: 19.6, nudge: [16, -9] }, //  可娜，夏威夷大島
  GT: { lon: -90.5, lat: 14.6, nudge: [-14, -11] }, // 安提瓜
  JM: { lon: -77.3, lat: 18.1, nudge: [16, -8] }, //   藍山
  PA: { lon: -80.5, lat: 8.6, nudge: [-16, 3] }, //    波奎特
  CO: { lon: -75, lat: 4.5, nudge: [16, 12] }, //      考卡／哥倫比亞中部
  PE: { lon: -78.5, lat: -6.5, nudge: [-16, 12] }, //  卡哈馬卡一帶（北方）
  ET: { lon: 39, lat: 7.5, nudge: [16, -9] }, //       耶加雪菲／班奇馬吉
  KE: { lon: 37, lat: -0.3, nudge: [16, 13] }, //      肯亞山一帶
  ID: { lon: 98.9, lat: 2.4, nudge: [-16, 15] }, //    蘇門答臘林東
};

export default function OriginMap() {
  const countries = usedCountries();
  const [on, setOn] = useState<CountryCode | null>(null);
  const active = countries.find((c) => c.code === on) ?? null;

  return (
    <div className="rk-map">
      <div className="rk-map__canvas">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="咖啡帶產地地圖">
          {/* 咖啡帶：南北回歸線之間 */}
          <rect
            className="rk-map__belt"
            x="0"
            y={proj(0, 25)[1]}
            width={W}
            height={proj(0, -25)[1] - proj(0, 25)[1]}
          />
          <text className="rk-map__belt-lab" x="8" y={proj(0, 25)[1] - 6}>
            TROPIC OF CANCER 23.5°N
          </text>
          <text className="rk-map__belt-lab" x="8" y={proj(0, -25)[1] + 13}>
            TROPIC OF CAPRICORN 23.5°S
          </text>
          <line
            x1="0"
            y1={proj(0, 0)[1]}
            x2={W}
            y2={proj(0, 0)[1]}
            stroke="var(--rk-line)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />

          <g className="rk-map__land">
            <path d={path(MEXICO)} />
            <path d={path(SOUTH_AM)} />
            <path d={path(AFRICA)} />
            <path d={path(ARABIA)} />
            <path d={path(INDIA)} />
            <path d={path(INDOCHINA)} />
            {ISLANDS.map((p, i) => (
              <path key={i} d={path(p)} />
            ))}
            {HAWAII.map(([lon, lat, r], i) => {
              const [x, y] = proj(lon, lat);
              return <circle key={i} cx={x} cy={y} r={r} />;
            })}
          </g>

          {countries.map((c) => {
            const pin = PINS[c.code];
            const [x, y] = proj(pin.lon, pin.lat);
            const [dx, dy] = pin.nudge;
            const sel = on === c.code;
            return (
              <g
                key={c.code}
                className="rk-map__pin"
                data-on={sel ? "1" : undefined}
                onMouseEnter={() => setOn(c.code)}
                onFocus={() => setOn(c.code)}
                onClick={() => setOn(sel ? null : c.code)}
                role="button"
                tabIndex={0}
                aria-label={`${c.name}，${c.count} 支`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOn(sel ? null : c.code);
                  }
                }}
              >
                <circle className="halo" cx={x} cy={y} r="11" />
                <circle className="core" cx={x} cy={y} r="3.6" />
                <text x={x + dx} y={y + dy} textAnchor={dx < 0 ? "end" : "start"}>
                  {c.name}
                  <tspan fill="var(--rk-mute)" dx="5">
                    {c.count}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rk-map__read">
        {active ? (
          <>
            <p style={{ fontSize: 15 }}>
              <b style={{ fontWeight: 600 }}>{active.name}</b>
              <span className="rk-mute" style={{ marginLeft: 10, fontSize: 13.5 }}>
                本期 {active.count} 支
              </span>
            </p>
            <Link
              className="rk-arrow"
              href={`${RK}/beans?country=${active.code}`}
              style={{ color: "var(--rk-accent)" }}
            >
              看這個產地
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </Link>
          </>
        ) : (
          <p className="rk-mute" style={{ fontSize: 13.5 }}>
            咖啡樹只長在南北回歸線之間這條帶子上。本期九個產地，從夏威夷可娜一路排到蘇門答臘。
            點任何一個點看該產地的豆子。
          </p>
        )}
      </div>
    </div>
  );
}
