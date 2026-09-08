import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import {
  updateProduct,
  archiveProduct,
  archiveImage,
  attachImages,
} from "@/lib/daigou-data";
import { parseTaipeiLocalInput } from "@/lib/tw-time";
import { isCategoryKey } from "@/app/sites/amber/_data/categories";

// 改商品。刻意與上架分開，而且刻意用純 HTML 表單。
//
// 上架要的是「按下去表單立刻清空、馬上打下一件」，所以走 JSON ＋ 樂觀送出。
// 改商品一天做幾次，不趕時間，無 JS 的表單在網路差的時候反而更可靠
// （瀏覽器自己處理重送），也沿用 portal 既有的做法。
//
// nginx 只放行 GET/HEAD/POST，所以刪除也是 POST 表單而不是 DELETE。

export const dynamic = "force-dynamic";

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  const action = String(form.get("action") ?? "save");
  if (!id) return new NextResponse("Bad Request", { status: 400 });

  const target = `/portal/amber/products/${encodeURIComponent(id)}`;
  const back = (path: string, error?: string) =>
    NextResponse.redirect(absoluteUrl(req, error ? `${path}?error=${error}` : path), 303);

  if (action === "archive") {
    // 軟刪除。本專案不做實體 delete：已下單的行存的是快照所以金額不會壞，
    // 但硬刪會毀掉「我那天到底上了什麼」的紀錄，而且軟刪除的商品
    // 正是「再上一件」的來源。她單手操作誤觸刪除也救得回來。
    const ok = await archiveProduct(tenant.slug, id);
    return ok ? back("/portal/amber") : back(target, "notfound");
  }

  if (action === "add-images") {
    // 照片已經由 /api/portal/amber/upload 傳好了（前端壓縮 → 伺服器重編碼），
    // 這裡收到的只是那些圖的 id，把它們接到這件商品上。
    const ids = String(form.get("imageIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (ids.length === 0) return back(target, "bad");
    await attachImages(tenant.slug, id, ids);
    return back(target);
  }

  if (action === "remove-image") {
    const imageId = String(form.get("imageId") ?? "").trim();
    if (!imageId) return back(target, "bad");
    await archiveImage(tenant.slug, imageId);
    return back(target);
  }

  const name = String(form.get("name") ?? "").trim();
  const price = num(form.get("price"));
  if (!name || name.length > 120 || price === null) return back(target, "bad");

  const rawCategory = String(form.get("categoryKey") ?? "").trim();
  const categoryKey = rawCategory && isCategoryKey(rawCategory) ? rawCategory : null;

  // 台北的牆上時間，由伺服器換算（見 tw-time.ts）。留空 = 永不截止。
  const rawDeadline = String(form.get("deadline") ?? "").trim();
  let deadlineAt: Date | null = null;
  if (rawDeadline) {
    deadlineAt = parseTaipeiLocalInput(rawDeadline);
    if (!deadlineAt) return back(target, "deadline");
  }

  const statusRaw = String(form.get("status") ?? "live");
  const status = ["draft", "live", "hidden"].includes(statusRaw) ? statusRaw : "live";

  const ok = await updateProduct(tenant.slug, id, {
    name,
    price,
    categoryKey,
    note: String(form.get("note") ?? "").trim() || null,
    deadlineAt,
    preorder: form.get("preorder") === "on",
    showStock: form.get("showStock") === "on",
    stock: num(form.get("stock")),
    status,
  });

  return ok ? back(target) : back(target, "notfound");
}
