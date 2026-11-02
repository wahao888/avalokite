"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/** 付款成功頁送一次 purchase。伺服器元件不能碰 window，所以獨立出來。 */
export default function PurchaseTrack({ orderId, value }: { orderId: string; value?: number }) {
  useEffect(() => {
    track("purchase", { id: orderId, value });
  }, [orderId, value]);
  return null;
}
