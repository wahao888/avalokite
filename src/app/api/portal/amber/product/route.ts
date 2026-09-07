import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenantSession } from "@/lib/tenant-auth";
import { sameOrigin } from "@/lib/portal-http";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { createProduct, updateProduct, getBatch } from "@/lib/daigou-data";
import { parseTaipeiLocalInput } from "@/lib/tw-time";
import { isCategoryKey } from "@/app/sites/amber/_data/categories";
import { MAX_OPTIONS } from "@/app/sites/amber/_data/spec-presets";

// 上架 / 改商品。
//
// 用 JSON 而不是表單送出，是因為上架頁需要「樂觀送出」——按下去表單立刻清空、
// 焦點回到名稱欄，她可以馬上打下一件。用表單導頁的話每件商品都要等一次往返，
// 20 件就是 20 次等待。
//
// nginx 只放行 GET/HEAD/POST，所以更新也走 POST（帶 id）而不是 PATCH。

export const dynamic = "force-dynamic";

const RATE = { windowMs: 10 * 60_000, max: 120 };

const OptionSchema = z.object({
  label: z.string().trim().min(1).max(60),
  price: z.number().int().min(0).max(1_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(9999).nullable().optional(),
});

const Schema = z.object({
  /** 有 id = 改既有商品；沒有 = 新上架 */
  id: z.string().trim().max(40).optional(),
  batchId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(1_000_000),
  categoryKey: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  optionAxis: z.string().trim().max(20).nullable().optional(),
  options: z.array(OptionSchema).max(MAX_OPTIONS).optional(),
  imageIds: z.array(z.string().trim().max(40)).max(12).optional(),
  /**
   * 台北的牆上時間字串（"2026-09-20T23:00"），不是 ISO 瞬間。
   * ⚠ 換算一定要在伺服器做：她上架時人在首爾，手機時區是 KST，
   * 讓瀏覽器 new Date() 會把「台北 23:00」存成台北的 22:00。
   * 空字串 = 沿用檔期的預設收單時間。
   */
  deadlineLocal: z.string().trim().max(30).nullable().optional(),
  preorder: z.boolean().optional(),
  showStock: z.boolean().optional(),
  stock: z.number().int().min(0).max(99999).nullable().optional(),
  status: z.enum(["draft", "live", "hidden"]).optional(),
  /** 冪等鍵。4G 逾時重送不會變成兩件商品 */
  clientRef: z.string().trim().max(64).nullable().optional(),
});

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  if (rateLimited(`product:${tenant.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  // 檔期必須存在且屬於本租戶。getBatch 的 where 已帶 tenantId，
  // 所以「拿別家的 batchId 來掛商品」在這裡就被擋掉。
  const batch = await getBatch(tenant.slug, input.batchId);
  if (!batch) return NextResponse.json({ error: "batch not found" }, { status: 400 });

  // 認不得的分類當作沒填，而不是報錯——她可能貼了一個舊連結。
  const categoryKey =
    input.categoryKey && isCategoryKey(input.categoryKey) ? input.categoryKey : null;

  // 空字串 / 未填 = 繼承檔期。刻意在建立時把值**複製**進商品，
  // 而不是存一個指向檔期的參照：之後改檔期不該無聲改掉已上架商品的截止時間。
  let deadlineAt: Date | null;
  if (input.deadlineLocal) {
    const d = parseTaipeiLocalInput(input.deadlineLocal);
    if (!d) return NextResponse.json({ error: "invalid deadline" }, { status: 400 });
    deadlineAt = d;
  } else {
    deadlineAt = batch.defaultDeadlineAt;
  }

  if (input.id) {
    const ok = await updateProduct(tenant.slug, input.id, {
      name: input.name,
      price: input.price,
      categoryKey,
      note: input.note ?? null,
      deadlineAt,
      preorder: input.preorder ?? false,
      showStock: input.showStock ?? false,
      stock: input.stock ?? null,
      status: input.status ?? "live",
    });
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: input.id, name: input.name });
  }

  const product = await createProduct(tenant.slug, {
    batchId: input.batchId,
    name: input.name,
    price: input.price,
    categoryKey,
    note: input.note ?? null,
    optionAxis: input.optionAxis || null,
    options: input.options ?? [],
    imageIds: input.imageIds ?? [],
    deadlineAt,
    preorder: input.preorder ?? false,
    showStock: input.showStock ?? false,
    stock: input.stock ?? null,
    status: input.status ?? "live",
    clientRef: input.clientRef ?? null,
  });

  return NextResponse.json({ ok: true, id: product.id, name: product.name });
}
