"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VENUES } from "../_data/venues";
import { findItem } from "../_data/catalog";
import { WS } from "../_data/site";

// 場域快選：選擇施工場域 → 顯示常用料 → 帶清單去估價
// 選擇記到 sessionStorage，型錄頁據此標「你的場域常用」
export const VENUE_STORAGE_KEY = "ws-venue";

export default function VenuePicker() {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(VENUE_STORAGE_KEY);
      if (saved && VENUES.some((v) => v.id === saved)) setSelected(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const pick = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    try {
      if (next) sessionStorage.setItem(VENUE_STORAGE_KEY, next);
      else sessionStorage.removeItem(VENUE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const venue = VENUES.find((v) => v.id === selected) ?? null;

  return (
    <div className="ws-venues">
      <div className="ws-chips" role="group" aria-label="選擇施工場域">
        {VENUES.map((v) => (
          <button
            key={v.id}
            type="button"
            className="ws-chip"
            aria-pressed={selected === v.id}
            onClick={() => pick(v.id)}
          >
            {v.name}
          </button>
        ))}
      </div>

      {venue && (
        <div className="ws-venue-panel">
          <h3>{venue.name}，通常會用到這些</h3>
          <p className="ws-venue-panel__blurb">{venue.blurb}</p>
          <div className="ws-venue-panel__items">
            {venue.suggestedItemIds.map((id) => {
              const found = findItem(id);
              if (!found) return null;
              return (
                <span key={id} className="ws-tag">
                  {found.item.name}
                </span>
              );
            })}
          </div>
          <div className="ws-venue-panel__cta">
            <Link href={`${WS}/quote?venue=${venue.id}`} className="ws-btn ws-btn--primary">
              帶著這份清單去估價
            </Link>
            <Link href={`${WS}/products`} className="ws-btn ws-btn--ghost">
              先逛完整目錄
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
