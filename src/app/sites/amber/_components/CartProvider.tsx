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

import { normalizeCart, type CartLine, type Totals } from "../_data/cart";

// 購物車。沿用 REKAT 已驗證過的形狀，但有一個關鍵差異。
//
// REKAT 的商品目錄在 _data/beans.ts，所以價格可以在客戶端就算出來。
// 這裡的目錄在資料庫，客戶端**沒有**價格資料——localStorage 只存
// { productId, optionId, qty }，總金額一律打 /api/amber/cart/price 回來。
//
// 這個差異其實讓事情更安全：客戶端連「價格」這個概念都沒有，
// 自然也偽造不了。下單時伺服器再重算一次，兩邊不可能分岔。
//
// 代價是購物車需要一次網路往返才顯示得出金額，所以：
//   ・件數（count）純從本地算，開頁就看得到，不等網路
//   ・金額顯示 pending 狀態，不用假數字填空
//   ・往返失敗時停用結帳並說明原因，**不用猜的**

const KEY = "amber.cart.v1";

type Pricing =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; totals: Totals }
  | { state: "error" };

type Ctx = {
  lines: CartLine[];
  /** localStorage 讀完之前是 false。用來避免 hydration mismatch */
  ready: boolean;
  /** 本地件數，不需要等伺服器 */
  count: number;
  pricing: Pricing;
  add: (productId: string, optionId: string | null, qty: number) => void;
  setQty: (productId: string, optionId: string | null, qty: number) => void;
  remove: (productId: string, optionId: string | null) => void;
  clear: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  /** 剛加入的那一筆，用來讓購物車數字跳一下 */
  bump: number;
  refresh: () => void;
};

const CartCtx = createContext<Ctx | null>(null);

export const useCart = (): Ctx => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart 必須在 CartProvider 裡使用");
  return c;
};

const same = (a: CartLine, productId: string, optionId: string | null) =>
  a.productId === productId && a.optionId === optionId;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [pricing, setPricing] = useState<Pricing>({ state: "idle" });

  // ── 載入 ────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // normalizeCart 會把形狀不對的東西全部丟掉——localStorage 是使用者可改的
      setLines(raw ? normalizeCart(JSON.parse(raw)) : []);
    } catch {
      setLines([]);
    }
    setReady(true);
  }, []);

  // ── 寫回。ready 之前不寫，否則第一次 render 會用空陣列蓋掉她的購物車 ──
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* 無痕模式或空間滿了，忽略 */
    }
  }, [lines, ready]);

  // ── 跨分頁同步 ──────────────────────────────────────
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        setLines(e.newValue ? normalizeCart(JSON.parse(e.newValue)) : []);
      } catch {
        /* 忽略 */
      }
    };
    addEventListener("storage", onStorage);
    return () => removeEventListener("storage", onStorage);
  }, []);

  // ── 定價：跟伺服器要 ────────────────────────────────
  // 用序號擋住亂序回應：連按加號時，較早發出的請求可能較晚回來，
  // 直接採用會讓畫面顯示上一個狀態的金額。
  const seq = useRef(0);
  const fetchPricing = useCallback(async (current: CartLine[]) => {
    if (current.length === 0) {
      setPricing({ state: "idle" });
      return;
    }
    const mine = ++seq.current;
    setPricing({ state: "loading" });
    try {
      const res = await fetch("/api/amber/cart/price", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: current }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const totals = (await res.json()) as Totals;
      if (mine === seq.current) setPricing({ state: "ok", totals });
    } catch {
      if (mine === seq.current) setPricing({ state: "error" });
    }
  }, []);

  // 內容變動後 debounce 再問價。她連按五次加號只會打一次 API。
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => void fetchPricing(lines), 250);
    return () => clearTimeout(t);
  }, [lines, ready, fetchPricing]);

  const add = useCallback((productId: string, optionId: string | null, qty: number) => {
    setLines((prev) => {
      const hit = prev.find((l) => same(l, productId, optionId));
      const next = hit
        ? prev.map((l) => (same(l, productId, optionId) ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { productId, optionId, qty }];
      // 正規化順便處理數量與行數上限
      return normalizeCart(next);
    });
    setBump((n) => n + 1);
    // 刻意**不**打開抽屜。連線期間客人是一路狂加，
    // 每加一次就彈出來會把她打斷、也擋住下一個商品。
  }, []);

  const setQty = useCallback((productId: string, optionId: string | null, qty: number) => {
    setLines((prev) =>
      normalizeCart(
        qty <= 0
          ? prev.filter((l) => !same(l, productId, optionId))
          : prev.map((l) => (same(l, productId, optionId) ? { ...l, qty } : l)),
      ),
    );
  }, []);

  const remove = useCallback((productId: string, optionId: string | null) => {
    setLines((prev) => prev.filter((l) => !same(l, productId, optionId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const refresh = useCallback(() => void fetchPricing(lines), [fetchPricing, lines]);

  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const value = useMemo<Ctx>(
    () => ({ lines, ready, count, pricing, add, setQty, remove, clear, open, setOpen, bump, refresh }),
    [lines, ready, count, pricing, add, setQty, remove, clear, open, bump, refresh],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
