"use client";

import { useEffect, useState } from "react";

/**
 * 可一鍵複製的欄位。用在匯款帳號上。
 *
 * 帳號是十五位數字，客人要從螢幕抄到網銀——每多抄一次就多一次抄錯的機會，
 * 而抄錯的代價是錢匯到別人戶頭。能點一下複製就少一個環節。
 *
 * navigator.clipboard 在非 HTTPS 或舊瀏覽器上不存在，這時就退回純顯示，
 * 不顯示一顆按了沒反應的按鈕。
 */
export default function CopyField({ value, label }: { value: string; label: string }) {
  const [can, setCan] = useState(false);
  const [done, setDone] = useState(false);

  // 能不能複製要等到瀏覽器端才知道，伺服器端一律先當作不能，避免 hydration 不一致
  useEffect(() => {
    setCan(typeof navigator !== "undefined" && !!navigator.clipboard);
  }, []);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1800);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <span className="rk-copy">
      <span className="rk-copy__v">{value}</span>
      {can && (
        <button
          type="button"
          className="rk-copy__btn"
          aria-label={`複製${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setDone(true);
            } catch {
              /* 使用者拒絕權限或瀏覽器擋下：維持原樣，客人還是看得到號碼 */
            }
          }}
        >
          {done ? "已複製" : "複製"}
        </button>
      )}
    </span>
  );
}
