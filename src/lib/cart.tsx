"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getProduct } from "./products";
import { measureItemsAdded, track } from "./track";

export interface CartItem {
  sku: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  ready: boolean; // localStorage 已載入
  add: (sku: string | readonly string[]) => void;
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
  const currentItems = useRef(items);

  // 同一個操作可以連續修改購物車，追蹤則在 React 更新函式外執行。
  const updateItems = useCallback((next: CartItem[]) => {
    currentItems.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        updateItems(parsed.filter((i) => getProduct(i.sku) && i.qty > 0));
      }
    } catch {
      /* 壞資料直接重置 */
    }
    setHydrated(true);
  }, [updateItems]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((selection: string | readonly string[]) => {
    const previous = currentItems.current;
    let next = previous;

    for (const sku of typeof selection === "string" ? [selection] : selection) {
      const prod = getProduct(sku);
      if (!prod) continue;
      track("add_to_cart", { sku });
      const found = next.some((i) => i.sku === sku);
      // 月費方案同品項不重複加（一個網站一份維護）；一次性可加量
      if (found) {
        if (prod.type !== "monthly") {
          next = next.map((i) => (i.sku === sku ? { ...i, qty: i.qty + 1 } : i));
        }
        continue;
      }
      // 月費互斥：一個網站只保留一份維護，加入新維護時移除既有維護
      const base =
        prod.type === "monthly"
          ? next.filter((i) => getProduct(i.sku)?.type !== "monthly")
          : next;
      next = [...base, { sku, qty: 1 }];
    }

    if (next === previous) return;
    updateItems(next);
    measureItemsAdded();
  }, [updateItems]);

  const remove = useCallback((sku: string) => {
    updateItems(currentItems.current.filter((i) => i.sku !== sku));
  }, [updateItems]);

  const setQty = useCallback((sku: string, qty: number) => {
    const previous = currentItems.current;
    const item = previous.find((i) => i.sku === sku);
    const nextQty = Math.min(qty, 9);
    if (!item || item.qty === nextQty) return;
    updateItems(nextQty <= 0
      ? previous.filter((i) => i.sku !== sku)
      : previous.map((i) => (i.sku === sku ? { ...i, qty: nextQty } : i)));
    if (nextQty > item.qty) measureItemsAdded();
  }, [updateItems]);

  const clear = useCallback(() => updateItems([]), [updateItems]);

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
      ready: hydrated,
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
