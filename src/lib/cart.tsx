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
import { cartConflict, getProduct, isPurchasable, maxQtyOf, orderSkusFor } from "./products";
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

/**
 * 一鍵下單：AI 客服附的 /cart?add=<sku> 連結，點進來就把方案（含必搭的維護）放進車。
 *
 * 放在 Provider 讀完 localStorage 的同一步做，而不是在購物車頁另開 effect 等
 * ready——兩邊各自的 effect 時序不保證，實測過頁面偶爾等不到 ready 變 true。
 * 只拿掉 add、保留 ref（來源追蹤要用）；拿掉也讓重新整理不會再加一次。
 */
function takeOrderLink(
  add: (skus: readonly string[]) => void,
  current: () => CartItem[],
  replace: (items: CartItem[]) => void,
) {
  const url = new URL(window.location.href);
  const sku = url.searchParams.get("add");
  if (!sku) return;
  const skus = orderSkusFor(sku);
  if (skus.length) {
    add(skus);
    // 車上原本的東西跟這次要買的不能同一張單（例如先放了 AI 客服、再點零元啟動的連結）：
    // 客人點的是「就買這個」，換成只剩這次的方案，不要留一台結不了帳的車給他。
    // 不衝突的（例如同類的加購）照樣保留。
    if (cartConflict(current().map((i) => i.sku))) {
      replace(skus.map((s) => ({ sku: s, qty: 1 })));
    }
  }
  url.searchParams.delete("add");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const currentItems = useRef(items);

  // 同一個操作可以連續修改購物車，追蹤則在 React 更新函式外執行。
  const updateItems = useCallback((next: CartItem[]) => {
    currentItems.current = next;
    setItems(next);
  }, []);

  // 開發模式的 StrictMode 會把 effect 跑兩次：第二次重讀 localStorage（那時還沒寫回）
  // 會蓋掉剛由一鍵下單放進去的品項，所以只載入一次
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CartItem[] = JSON.parse(raw);
        // 舊資料可能含已停售、依需求報價或超量的品項，載入時一併清掉／壓回上限
        updateItems(
          parsed
            .filter((i) => isPurchasable(i.sku) && i.qty > 0)
            .map((i) => ({ ...i, qty: Math.min(i.qty, maxQtyOf(i.sku)) })),
        );
      }
    } catch {
      /* 壞資料直接重置 */
    }
    takeOrderLink(add, () => currentItems.current, updateItems);
    setHydrated(true);
    // add 是穩定的 useCallback；這個 effect 只在載入時跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateItems]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((selection: string | readonly string[]) => {
    const previous = currentItems.current;
    let next = previous;

    for (const sku of typeof selection === "string" ? [selection] : selection) {
      const prod = getProduct(sku);
      if (!prod || !isPurchasable(sku)) continue;
      track("add_to_cart", { sku });
      const found = next.some((i) => i.sku === sku);
      // 月費方案同品項不重複加（一個網站一份維護）；一次性可加量
      if (found) {
        if (prod.type !== "monthly") {
          next = next.map((i) =>
            i.sku === sku ? { ...i, qty: Math.min(i.qty + 1, maxQtyOf(sku)) } : i,
          );
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
    const nextQty = Math.min(qty, maxQtyOf(sku));
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
