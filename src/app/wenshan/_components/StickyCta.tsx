"use client";

import Link from "next/link";
import { SITE, WS } from "../_data/site";
import { useQuoteList } from "./QuoteListProvider";

// 手機底部固定列：電話 / LINE / 估價（估價鈕帶詢價清單數量）
export default function StickyCta() {
  const { items } = useQuoteList();

  return (
    <div className="ws-sticky" role="navigation" aria-label="快速聯絡">
      <a href={`tel:${SITE.phoneTel}`}>☎ 撥打電話</a>
      {SITE.lineId ? (
        <a
          href={`https://line.me/R/ti/p/${SITE.lineId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LINE 詢問
        </a>
      ) : (
        <span className="ws-sticky__line" aria-disabled="true">
          LINE 即將開通
        </span>
      )}
      <Link href={`${WS}/quote`} className="ws-sticky__quote">
        線上估價
        {items.length > 0 && <span className="ws-sticky__badge">{items.length}</span>}
      </Link>
    </div>
  );
}
