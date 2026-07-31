"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// 詢價清單：取代購物車的輕量體驗（localStorage，無金流）
export interface QuoteListEntry {
  id: string;
  name: string;
  /** 使用者填的規格/數量備註 */
  qty?: string;
}

interface QuoteListCtx {
  items: QuoteListEntry[];
  has: (id: string) => boolean;
  add: (entry: QuoteListEntry) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: string) => void;
  clear: () => void;
}

const Ctx = createContext<QuoteListCtx | null>(null);
const STORAGE_KEY = "ws-quote-list";

export function QuoteListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteListEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* localStorage 不可用時靜默降級 */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const add = useCallback((entry: QuoteListEntry) => {
    setItems((prev) => (prev.some((i) => i.id === entry.id) ? prev : [...prev, entry]));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, has, add, remove, setQty, clear }),
    [items, has, add, remove, setQty, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQuoteList(): QuoteListCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuoteList must be used within QuoteListProvider");
  return ctx;
}
