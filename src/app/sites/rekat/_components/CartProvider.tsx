"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MAX_LINES,
  MAX_QTY_PER_LINE,
  normalizeCart,
  priceCart,
  type CartLine,
  type PaymentKey,
  type Totals,
} from "../_data/shop";

/* 購物車狀態。
 *
 * 只存 { slug, qty }——不存品名與價格。價格的唯一真實來源是 _data/beans.ts，
 * 由 priceCart() 在渲染時算出來；後端收單時用同一支函式重算一次。
 * 這樣「客人的瀏覽器裡躺著三個月前的舊價格」這個問題從結構上就不存在。
 */

const KEY = "rekat.cart.v1";

type CartCtx = {
  lines: CartLine[];
  /** hydration 完成前為 false；未完成時 UI 不顯示數量，避免 SSR 與客戶端不一致 */
  ready: boolean;
  count: number;
  totals: Totals;
  add: (slug: string, qty?: number, openDrawer?: boolean) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);

function load(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    // normalizeCart 會把不存在的 slug 與非法數量全部丟掉
    return normalizeCart(v as CartLine[]);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
  }, []);

  // 寫回 localStorage。ready 之前不寫，否則會在讀取完成前先用空陣列蓋掉舊資料。
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* 無痕模式或配額滿：購物車退化成單次瀏覽有效，不該讓頁面壞掉 */
    }
  }, [lines, ready]);

  // 另一個分頁改了購物車時同步過來（有人習慣開很多分頁逛）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLines(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** openDrawer=false：豆單卡片上的「加入」不要每次都把抽屜彈出來打斷選豆 */
  const add = useCallback((slug: string, qty = 1, openDrawer = true) => {
    setLines((prev) => {
      const next = [...prev];
      const i = next.findIndex((l) => l.slug === slug);
      if (i >= 0) {
        next[i] = { ...next[i]!, qty: Math.min(MAX_QTY_PER_LINE, next[i]!.qty + qty) };
      } else {
        if (next.length >= MAX_LINES) return prev;
        next.push({ slug, qty: Math.min(MAX_QTY_PER_LINE, qty) });
      }
      return normalizeCart(next);
    });
    if (openDrawer) setOpen(true);
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setLines((prev) =>
      normalizeCart(
        prev
          .map((l) => (l.slug === slug ? { ...l, qty: Math.max(0, Math.min(MAX_QTY_PER_LINE, qty)) } : l))
          .filter((l) => l.qty > 0),
      ),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // 抽屜開著時鎖住背景捲動。用 position: fixed 會跳回頂端，所以只動 overflow。
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // 抽屜的金額一律以匯款試算（不含貨到付款手續費）——手續費在結帳頁選了才加。
  const totals = useMemo(() => priceCart(lines, "transfer" as PaymentKey), [lines]);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      ready,
      count: totals.count,
      totals,
      add,
      setQty,
      remove,
      clear,
      open,
      setOpen,
    }),
    [lines, ready, totals, add, setQty, remove, clear, open],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart 必須在 <CartProvider> 內使用");
  return c;
}
