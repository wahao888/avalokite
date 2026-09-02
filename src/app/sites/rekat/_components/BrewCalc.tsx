"use client";

import { useState } from "react";
import { BREW_METHODS } from "../_data/knowledge";
import { ROAST, type RoastKey } from "../_data/beans";

/* 沖煮參數計算機。
 *
 * 粉水比這種東西寫成表沒人會換算，做成拉桿就會有人真的照著沖。
 * 參數是通則（SCA 黃金基準 1:15、淺焙水溫拉高），不是本店的獨門配方。 */

const parseRatio = (s: string): number => {
  // "1:15" → 15；"1:2 – 1:2.5" → 2.25（義式取區間中值）
  const nums = [...s.matchAll(/1:(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length === 0) return 15;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export default function BrewCalc({ defaultRoast = "light" }: { defaultRoast?: RoastKey }) {
  const [methodKey, setMethodKey] = useState(BREW_METHODS[0]!.key);
  const [roast, setRoast] = useState<RoastKey>(defaultRoast);
  const [dose, setDose] = useState(15);

  const m = BREW_METHODS.find((x) => x.key === methodKey)!;
  const ratio = parseRatio(m.ratio);
  const water = Math.round(dose * ratio);
  const [tLo, tHi] = m.temp[roast];

  return (
    <div className="rk-calc">
      <div className="rk-filterrow" style={{ marginBottom: 16 }}>
        <span className="rk-eyebrow">沖煮方式</span>
        <div className="rk-chips">
          {BREW_METHODS.map((x) => (
            <button
              key={x.key}
              type="button"
              className="rk-chip"
              aria-pressed={methodKey === x.key}
              onClick={() => setMethodKey(x.key)}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rk-filterrow" style={{ marginBottom: 20 }}>
        <span className="rk-eyebrow">烘焙度</span>
        <div className="rk-chips">
          {(["light", "light-medium"] as RoastKey[]).map((r) => (
            <button
              key={r}
              type="button"
              className="rk-chip"
              aria-pressed={roast === r}
              onClick={() => setRoast(r)}
            >
              {ROAST[r].labelZh}
            </button>
          ))}
        </div>
      </div>

      <div className="rk-calc__row">
        <label className="rk-eyebrow" htmlFor="rk-dose" style={{ minWidth: 74 }}>
          咖啡粉量
        </label>
        <input
          id="rk-dose"
          type="range"
          min={10}
          max={40}
          step={1}
          value={dose}
          onChange={(e) => setDose(Number(e.target.value))}
          aria-valuetext={`${dose} 公克`}
        />
        <b className="rk-num" style={{ fontSize: 20, minWidth: 68, textAlign: "right" }}>
          {dose}
          <i style={{ fontStyle: "normal", fontSize: 13, color: "var(--rk-mute)", marginLeft: 3 }}>g</i>
        </b>
      </div>

      <div className="rk-calc__out">
        <div>
          <b>
            {water}
            <i>g 水</i>
          </b>
          <span>粉水比 {m.ratio}</span>
        </div>
        <div>
          <b>
            {tLo}–{tHi}
            <i>°C</i>
          </b>
          <span>水溫</span>
        </div>
        <div>
          <b style={{ fontSize: 18, lineHeight: 1.6 }}>{m.time}</b>
          <span>建議時間</span>
        </div>
        <div>
          <b style={{ fontSize: 16, lineHeight: 1.7 }}>{m.grind}</b>
          <span>研磨度</span>
        </div>
      </div>

      <p style={{ fontSize: 13.5, lineHeight: 1.9, color: "var(--rk-ink-2)", marginTop: 18 }}>
        {m.tip}
      </p>
      <p className="rk-caveat" style={{ marginTop: 14 }}>
        以上為業界通行的建議區間（SCA 黃金比例 1:15、淺焙水溫上調），供起手參考。
        每一批豆子的最佳參數仍需自己微調——先固定其他變因，一次只改一項。
      </p>
    </div>
  );
}
