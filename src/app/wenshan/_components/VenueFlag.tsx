"use client";

import { useEffect, useState } from "react";
import { findVenue } from "../_data/venues";
import { VENUE_STORAGE_KEY } from "./VenuePicker";

// 型錄分類標題旁的「你的場域常用」小標（依 sessionStorage 的場域快選結果）
export default function VenueFlag({ categoryId }: { categoryId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const venue = findVenue(sessionStorage.getItem(VENUE_STORAGE_KEY));
      setShow(!!venue && venue.categoryIds.includes(categoryId));
    } catch {
      /* ignore */
    }
  }, [categoryId]);

  if (!show) return null;
  return <span className="ws-venue-flag">你的場域常用</span>;
}
