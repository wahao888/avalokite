"use client";

import { useQuoteList } from "./QuoteListProvider";

// 型錄品項旁的「＋加入詢價單」按鈕
export default function AddItemButton({ id, name }: { id: string; name: string }) {
  const { has, add, remove } = useQuoteList();
  const added = has(id);

  return (
    <button
      type="button"
      className="ws-additem"
      data-added={added || undefined}
      onClick={() => (added ? remove(id) : add({ id, name }))}
      aria-pressed={added}
    >
      {added ? "✓ 已加入詢價單" : "＋ 加入詢價單"}
    </button>
  );
}
