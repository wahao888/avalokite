"use client";

import { useState } from "react";

// 才數計算機：角材 1才 = 1寸×1寸×10尺；板料 1才 = 1尺×1尺
export default function CaiCalculator() {
  const [mode, setMode] = useState<"lumber" | "board">("lumber");
  const [a, setA] = useState("1.2");
  const [b, setB] = useState("1");
  const [len, setLen] = useState("8");
  const [count, setCount] = useState("10");

  const na = parseFloat(a);
  const nb = parseFloat(b);
  const nl = parseFloat(len);
  const nc = parseInt(count, 10);
  const valid = [na, nb, nl].every((n) => Number.isFinite(n) && n > 0) && nc > 0;

  let cai = 0;
  if (valid) {
    cai =
      mode === "lumber"
        ? ((na * nb * nl) / 10) * nc // 寸×寸×尺 ÷ 10
        : na * nb * nc; // 尺×尺
  }

  return (
    <div className="ws-tool">
      <h3>才數計算機</h3>
      <div className="ws-tool__row">
        <select value={mode} onChange={(e) => setMode(e.target.value as "lumber" | "board")}>
          <option value="lumber">角材（寸×寸×尺）</option>
          <option value="board">板料（尺×尺）</option>
        </select>
        {mode === "lumber" ? (
          <>
            <label>
              寬 <input type="number" step="0.1" min="0" value={a} onChange={(e) => setA(e.target.value)} /> 寸
            </label>
            <label>
              厚 <input type="number" step="0.1" min="0" value={b} onChange={(e) => setB(e.target.value)} /> 寸
            </label>
            <label>
              長 <input type="number" step="0.5" min="0" value={len} onChange={(e) => setLen(e.target.value)} /> 尺
            </label>
          </>
        ) : (
          <>
            <label>
              寬 <input type="number" step="0.5" min="0" value={a} onChange={(e) => setA(e.target.value)} /> 尺
            </label>
            <label>
              長 <input type="number" step="0.5" min="0" value={b} onChange={(e) => setB(e.target.value)} /> 尺
            </label>
          </>
        )}
        <label>
          數量 <input type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />{" "}
          {mode === "lumber" ? "支" : "片"}
        </label>
      </div>
      <p className="ws-tool__result" aria-live="polite">
        {valid ? (
          <>
            合計約 <strong>{cai.toFixed(1)}</strong> 才
          </>
        ) : (
          "請輸入尺寸與數量"
        )}
      </p>
      <p className="ws-tool__hint">
        角材 1才＝1寸×1寸×10尺；板料 1才＝1尺×1尺。估料抓不準沒關係，送出估價單後我們幫你算。
      </p>
    </div>
  );
}
