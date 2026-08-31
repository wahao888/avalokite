"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import FlavorCard from "./FlavorCard";
import type { Flavor, FlavorFlags } from "../_data/flavors";

/**
 * /flavors 的篩選與清單。
 *
 * 篩選條件刻意只用「站方確定為真」的資料：今天供不供應（店家後台勾的）、
 * 有沒有結束日期、有沒有開賣日期。成分類的篩選（純素、含酒、無麩質）
 * 要等店家逐項確認過才會出現——寧可少一個篩選，不要給錯的答案。
 */

type Item = Flavor & { flags: FlavorFlags; today: boolean };

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "today", label: "今日供應" },
  { id: "new", label: "新登場" },
  { id: "limited", label: "期間限定" },
  { id: "signature", label: "常駐招牌" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const match = (f: Item, id: FilterId) => {
  switch (id) {
    case "today":
      return f.today;
    case "new":
      return f.flags.isNew;
    case "limited":
      return f.flags.isLimited;
    case "signature":
      return f.kind === "signature";
    default:
      return true;
  }
};

export default function FlavorBrowser({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const counts = useMemo(() => {
    const c = {} as Record<FilterId, number>;
    for (const f of FILTERS) c[f.id] = items.filter((i) => match(i, f.id)).length;
    return c;
  }, [items]);

  const shown = useMemo(() => items.filter((i) => match(i, filter)), [items, filter]);

  return (
    <>
      <div className="ml-filters" role="group" aria-label="口味篩選">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="ml-chip"
            aria-pressed={filter === f.id}
            disabled={counts[f.id] === 0 && f.id !== "all"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span style={{ opacity: 0.55, marginLeft: 7 }}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <p className="ml-count" aria-live="polite" style={{ marginBottom: 18 }}>
        {shown.length} 款
      </p>

      {/* 刻意不用 layout 動畫：那需要 domMax feature bundle（大很多），
          而且 grid 重排的投影計算在低階手機上是實打實的成本。
          淡入淡出 + 微縮放已經足夠交代「清單換了」。 */}
      <div className="ml-grid">
        <AnimatePresence initial={false}>
          {shown.map((f) => (
            <m.div
              key={f.slug}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <FlavorCard flavor={f} today={f.today} />
            </m.div>
          ))}
        </AnimatePresence>
      </div>

      {shown.length === 0 && (
        <p className="ml-lede" style={{ paddingBlock: 40 }}>
          這個條件下目前沒有口味。看看「全部」吧。
        </p>
      )}
    </>
  );
}
