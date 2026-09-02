"use client";

import { useState } from "react";
import Link from "next/link";
import { PROCESS, usedProcesses, type ProcessKey } from "../_data/beans";
import { RK } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   處理法圖解

   同一顆咖啡果實，在乾燥之前留下哪幾層，就決定了杯子裡會出現什麼。
   這張圖把果實剖成六層，切換處理法時把「乾燥時已經被去掉的層」淡掉——
   一眼就看得出水洗與日曬差在哪，不必讀完三段文字。
   ═══════════════════════════════════════════════════════════════ */

type Layer = { key: string; zh: string; en: string; r: number; fill: string };

// 由外而內。r 是外半徑（viewBox 0 0 220 220，圓心 110,110）
const LAYERS: Layer[] = [
  { key: "skin", zh: "外果皮", en: "Exocarp", r: 92, fill: "#B23A2E" },
  { key: "pulp", zh: "果肉", en: "Mesocarp", r: 80, fill: "#D4705C" },
  { key: "mucilage", zh: "果膠層", en: "Mucilage", r: 68, fill: "#E0A860" },
  { key: "parchment", zh: "內果皮", en: "Parchment", r: 58, fill: "#E4D9BC" },
  { key: "silverskin", zh: "銀皮", en: "Silver Skin", r: 50, fill: "#F0EAD8" },
  { key: "bean", zh: "生豆", en: "Green Bean", r: 44, fill: "#9AAE72" },
];

/**
 * 乾燥時「還留在豆子上」的層。這是各處理法真正的差別。
 *
 * 濕剝是唯一連內果皮都先拿掉的：它在含水率還有三成多時就去殼，
 * 後半段乾燥是裸豆自己走完的——圖上只剩銀皮與生豆兩層，一眼就看得出它為什麼那麼不一樣。
 */
const KEPT: Record<ProcessKey, string[]> = {
  washed: ["parchment", "silverskin", "bean"],
  "special-washed": ["parchment", "silverskin", "bean"],
  honey: ["mucilage", "parchment", "silverskin", "bean"],
  natural: ["skin", "pulp", "mucilage", "parchment", "silverskin", "bean"],
  "wet-hulled": ["silverskin", "bean"],
};

const STEPS: Record<ProcessKey, string[]> = {
  washed: ["採收紅果", "去皮去果肉", "水槽發酵 12–36 小時", "洗去果膠層", "帶殼豆日曬乾燥", "去殼成生豆"],
  "special-washed": [
    "採收紅果",
    "去皮去果肉",
    "控溫、控時的發酵（關鍵在這一步）",
    "洗去果膠層",
    "帶殼豆乾燥",
    "去殼成生豆",
  ],
  honey: ["採收紅果", "去皮去果肉", "保留果膠層不洗", "連著果膠層乾燥", "去殼成生豆"],
  natural: ["採收紅果", "整顆果實直接鋪曬", "翻動乾燥 2–4 週", "去除乾掉的果皮果肉", "取出生豆"],
  "wet-hulled": [
    "採收紅果",
    "去皮，短時間發酵後洗淨",
    "半乾至含水率約 30–35%",
    "此時就去除內果皮（濕剝）",
    "裸豆繼續曬到約 12%",
  ],
};

/**
 * 這個處理法把風味往哪裡推。[乾淨度, 甜感, 發酵香, 醇厚度] 各 0–1。
 * 加上「醇厚度」這一軸才講得清楚濕剝——它的重點從來不是發酵，是 Body。
 */
const PUSH: Record<ProcessKey, [number, number, number, number]> = {
  washed: [1, 0.45, 0.1, 0.4],
  "special-washed": [0.85, 0.8, 0.65, 0.45],
  honey: [0.7, 0.8, 0.35, 0.6],
  natural: [0.45, 1, 0.5, 0.7],
  "wet-hulled": [0.3, 0.6, 0.25, 1],
};

const PUSH_LABEL = ["乾淨度", "甜感", "發酵香", "醇厚度"];

export default function ProcessDiagram({
  counts,
}: {
  counts?: Partial<Record<ProcessKey, number>>;
}) {
  const list = usedProcesses();
  const [key, setKey] = useState<ProcessKey>(list[0]?.key ?? "washed");
  const p = PROCESS[key];
  const kept = new Set(KEPT[key]);
  const n = counts?.[key] ?? 0;

  return (
    <div className="rk-proc">
      <div className="rk-proc__tabs" role="tablist" aria-label="處理法">
        {list.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={key === x.key}
            onClick={() => setKey(x.key)}
          >
            {x.labelZh}
          </button>
        ))}
      </div>

      <div className="rk-proc__panel" role="tabpanel">
        <svg viewBox="0 0 220 220" role="img" aria-label={`${p.labelZh}的果實剖面`}>
          {/* 由外而內畫，內層蓋在外層上 */}
          {LAYERS.map((l) => (
            <circle
              key={l.key}
              className="rk-cherry__layer"
              data-off={kept.has(l.key) ? undefined : "1"}
              cx="110"
              cy="110"
              r={l.r}
              fill={l.fill}
              stroke="var(--rk-paper-2)"
              strokeWidth="1.2"
            />
          ))}
          {/* 生豆的中線溝 */}
          <path
            d="M110 68c-9 12-9 30 0 42s9 30 0 42"
            fill="none"
            stroke="#6E8250"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* 引線標註：只標「這個處理法留下來」的層，避免圖被文字塞爆 */}
          {LAYERS.filter((l) => kept.has(l.key)).map((l, i) => {
            const y = 26 + i * 15;
            return (
              <g key={l.key} opacity="0.9">
                <line x1={110} y1={110 - l.r + 6} x2={196} y2={y} stroke="var(--rk-line)" strokeWidth="0.8" />
                <circle cx={110} cy={110 - l.r + 6} r="2" fill={l.fill} />
                <text
                  x={200}
                  y={y + 3}
                  fontFamily="var(--rk-mono)"
                  fontSize="7.5"
                  fill="var(--rk-mute)"
                  letterSpacing="0.04em"
                >
                  {l.zh}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="rk-proc__beans" key={key}>
          <span className="rk-eyebrow">{p.labelEn}</span>
          <h3 className="rk-h3" style={{ marginTop: 4 }}>
            {p.labelZh}
          </h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.9, color: "var(--rk-ink-2)", marginTop: 8 }}>
            {p.gist}
          </p>

          <ol style={{ marginTop: 18, display: "grid", gap: 7 }}>
            {STEPS[key].map((s, i) => (
              <li
                key={s}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 1fr",
                  gap: 10,
                  fontSize: 13.5,
                  color: "var(--rk-ink-2)",
                }}
              >
                <span className="rk-num rk-mute" style={{ fontSize: 11 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 20, display: "grid", gap: 9 }}>
            {PUSH[key].map((v, i) => (
              <div key={PUSH_LABEL[i]} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "center" }}>
                <span className="rk-eyebrow" style={{ fontSize: 10 }}>
                  {PUSH_LABEL[i]}
                </span>
                <span
                  style={{
                    height: 4,
                    background: "var(--rk-line-soft)",
                    borderRadius: 999,
                    display: "block",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${v * 100}%`,
                      background: "var(--rk-accent)",
                      borderRadius: 999,
                      transition: "width 0.6s cubic-bezier(0.2,0.8,0.2,1)",
                    }}
                  />
                </span>
              </div>
            ))}
          </div>

          {n > 0 && (
            <Link className="rk-arrow" href={`${RK}/beans?process=${key}`} style={{ marginTop: 20, color: "var(--rk-accent)" }}>
              本期 {n} 支{p.labelZh}
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true">
                <path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
