"use client";

import { useState } from "react";
import { ALL_REGIONS, estimateFreight, INCLUDED_CAI } from "../_data/freight";

// 運費試算：資料與公告運費表同源（_data/freight.ts）
export default function FreightEstimator() {
  const [region, setRegion] = useState("台北市");
  const [cai, setCai] = useState("");

  const nCai = parseFloat(cai);
  const est = estimateFreight(region, Number.isFinite(nCai) ? nCai : undefined);

  return (
    <div className="ws-tool">
      <h3>運費快速試算</h3>
      <div className="ws-tool__row">
        <label>
          配送到{" "}
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {ALL_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          材積約 <input type="number" min="0" placeholder="選填" value={cai} onChange={(e) => setCai(e.target.value)} /> 才
        </label>
      </div>
      <p className="ws-tool__result" aria-live="polite">
        {est ? (
          est.fee === null ? (
            <>此區域採<strong>專案報價</strong>，歡迎來電洽詢</>
          ) : est.fee === 0 ? (
            <>
              雙北工地配送 <strong>免運</strong> 🎉
            </>
          ) : (
            <>
              預估 <strong>NT${est.fee.toLocaleString()}</strong>／趟起
            </>
          )
        ) : (
          "請選擇配送區域"
        )}
      </p>
      <p className="ws-tool__hint">
        每趟含 {INCLUDED_CAI} 才，實際運費依現場狀況為準；估價單送出後一併回覆正式運費。
      </p>
    </div>
  );
}
