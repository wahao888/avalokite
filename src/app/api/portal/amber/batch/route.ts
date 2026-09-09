import { NextRequest, NextResponse } from "next/server";

import { getTenantSession } from "@/lib/tenant-auth";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import {
  createBatch,
  updateBatch,
  extendBatchDeadline,
  purgeBatchFullImages,
} from "@/lib/daigou-data";
import { parseTaipeiLocalInput } from "@/lib/tw-time";

// 檔期的建立與維護。
//
// 刻意用純 HTML 表單而不是 JSON：這些動作一天只做幾次，不需要樂觀送出，
// 而無 JS 的表單在她網路差的時候反而更可靠（瀏覽器自己會處理重送）。
// 這也沿用 portal 既有的做法（見 order-status/route.ts）。

export const dynamic = "force-dynamic";

/** 檔期網址用的 slug：由標題轉出來，中文就退成日期＋亂數 */
function slugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stamp = Date.now().toString(36).slice(-4);
  return ascii ? `${ascii}-${stamp}`.slice(0, 60) : `batch-${stamp}`;
}

const num = (v: FormDataEntryValue | null, fallback = 0): number => {
  const n = Number(String(v ?? "").replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
};

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.daigou) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "create");
  const id = String(form.get("id") ?? "").trim();

  const back = (path: string, error?: string) =>
    NextResponse.redirect(absoluteUrl(req, error ? `${path}?error=${error}` : path), 303);

  if (action === "create") {
    const title = String(form.get("title") ?? "").trim();
    if (!title || title.length > 80) return back("/portal/amber", "bad");

    // 收單時間是台北的牆上時間，一定要由伺服器換算（見 tw-time.ts）
    const deadlineRaw = String(form.get("defaultDeadline") ?? "").trim();
    const defaultDeadlineAt = deadlineRaw ? parseTaipeiLocalInput(deadlineRaw) : null;
    if (deadlineRaw && !defaultDeadlineAt) return back("/portal/amber", "deadline");

    const etaRaw = String(form.get("defaultEta") ?? "").trim();
    // 預計到貨只有日期，補上台北時間的中午——只是顯示用，不做任何判斷
    const defaultEtaAt = etaRaw ? parseTaipeiLocalInput(`${etaRaw}T12:00`) : null;
    if (etaRaw && !defaultEtaAt) return back("/portal/amber", "eta");

    const batch = await createBatch(tenant.slug, {
      title,
      slug: slugify(title),
      defaultDeadlineAt,
      defaultEtaAt,
      shippingFee: num(form.get("shippingFee")),
      freeShippingOver: form.get("freeShippingOver") ? num(form.get("freeShippingOver")) : null,
      note: String(form.get("note") ?? "").trim() || null,
    });
    return back(`/portal/amber/batches/${encodeURIComponent(batch.id)}`);
  }

  if (!id) return back("/portal/amber", "bad");
  const target = `/portal/amber/batches/${encodeURIComponent(id)}`;

  if (action === "close" || action === "reopen" || action === "archive") {
    const status = action === "close" ? "closed" : action === "reopen" ? "open" : "archived";
    const ok = await updateBatch(tenant.slug, id, { status });
    return ok ? back(target) : back("/portal/amber", "notfound");
  }

  if (action === "extend") {
    // 整批延長。刻意是一個明確的動作而不是「改檔期就自動生效」——
    // 商品的截止時間在建立時是複製過去的，這裡把新值寫進每一列，
    // 她按下去就知道自己改了什麼。
    const raw = String(form.get("defaultDeadline") ?? "").trim();
    const at = raw ? parseTaipeiLocalInput(raw) : null;
    if (!at) return back(target, "deadline");
    await extendBatchDeadline(tenant.slug, id, at);
    return back(target);
  }

  if (action === "purge-images") {
    // 只清大圖、保留縮圖。歷史結單畫面與「複製上一件」只用得到縮圖。
    await purgeBatchFullImages(tenant.slug, id);
    return back(target);
  }

  if (action === "settings") {
    const ok = await updateBatch(tenant.slug, id, {
      shippingFee: num(form.get("shippingFee")),
      freeShippingOver: form.get("freeShippingOver") ? num(form.get("freeShippingOver")) : null,
      note: String(form.get("note") ?? "").trim() || null,
    });
    return ok ? back(target) : back("/portal/amber", "notfound");
  }

  return back("/portal/amber", "bad");
}
