"use client";

import { usePathname, useRouter } from "next/navigation";
import { WS } from "../_data/site";
import { useQuoteList } from "./QuoteListProvider";
import RingMark from "./RingMark";

// 桌機右下浮動詢價清單籤（清單為空或已在估價頁時隱藏）
export default function QuoteListFab() {
  const { items } = useQuoteList();
  const pathname = usePathname();
  const router = useRouter();

  if (items.length === 0 || pathname.startsWith(`${WS}/quote`)) return null;

  return (
    <button
      type="button"
      className="ws-fab"
      onClick={() => router.push(`${WS}/quote`)}
      aria-label={`前往估價，詢價清單共 ${items.length} 項`}
    >
      <RingMark />
      詢價清單
      <span className="ws-fab__count">{items.length}</span>
    </button>
  );
}
