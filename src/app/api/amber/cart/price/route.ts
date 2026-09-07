import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenant } from "@/lib/tenants";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { loadPricing } from "@/lib/daigou-data";
import { normalizeCart, priceLines, MAX_LINES } from "@/app/sites/amber/_data/cart";

// 購物車定價。
//
// ⚠ 租戶由**路徑常數**決定，不看 Host——Host 是使用者可控的輸入。
// 這是本 repo 既有的分工：頁面由 Host 判定（proxy.ts），API 由路徑判定。
//
// 這支路由零副作用：只讀資料庫、回傳算好的金額。所以限流可以放寬，
// 客人調整數量時每次都會打到它。

export const dynamic = "force-dynamic";

const TENANT = getTenant("amber")!;
const RATE = { windowMs: 60_000, max: 60 };

const Schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().max(40),
        optionId: z.string().max(40).nullable().optional(),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .max(MAX_LINES),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`cartprice:${TENANT.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  // 購物車的內容來自 localStorage，是使用者可改的。normalizeCart 會把形狀
  // 不對的東西全部丟掉，所以底下的查詢不會拿到奇怪的 id。
  const cart = normalizeCart(parsed.data.items);
  if (cart.length === 0) {
    return NextResponse.json({ lines: [], blocked: [], itemsTotal: 0, count: 0 });
  }

  const snaps = await loadPricing(
    TENANT.slug,
    cart.map((l) => ({ productId: l.productId, optionId: l.optionId })),
  );

  // priceLines 是純函式，下單路由也呼叫同一支——
  // 所以「螢幕上的數字」與「入庫的數字」不可能分岔。
  return NextResponse.json(priceLines(cart, snaps, new Date()));
}
