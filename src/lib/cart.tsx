"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getProduct } from "./products";

export interface CartItem {
  sku: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (sku: string) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, qty: number) => void;
  clear: () => void;
  has: (sku: string) => boolean;
  count: number;
  oneTimeSubtotal: number; // 未稅
  monthlySubtotal: number; // 未稅/月
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "avalo-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        setItems(parsed.filter((i) => getProduct(i.sku) && i.qty > 0));
      }
    } catch {
      /* 壞資料直接重置 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((sku: string) => {
    if (!getProduct(sku)) return;
    setItems((prev) => {
      const found = prev.find((i) => i.sku === sku);
      // 月費方案同品項不重複加（一個網站一份維護）；一次性可加量
      if (found) {
        const p = getProduct(sku)!;
        if (p.type === "monthly") return prev;
        return prev.map((i) => (i.sku === sku ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { sku, qty: 1 }];
    });
  }, []);

  const remove = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.sku !== sku)
        : prev.map((i) => (i.sku === sku ? { ...i, qty: Math.min(qty, 9) } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    let oneTime = 0;
    let monthly = 0;
    for (const i of items) {
      const p = getProduct(i.sku);
      if (!p) continue;
      if (p.type === "onetime") oneTime += p.price * i.qty;
      else monthly += p.price * i.qty;
    }
    return {
      items,
      add,
      remove,
      setQty,
      clear,
      has: (sku) => items.some((i) => i.sku === sku),
      count: items.reduce((n, i) => n + i.qty, 0),
      oneTimeSubtotal: oneTime,
      monthlySubtotal: monthly,
    };
  }, [items, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
