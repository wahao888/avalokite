import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { isShopStatus, setShopOrderStatus } from "@/lib/tenant-data";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  // getTenantSession 已同時比對 Host 與 cookie 內的 slug
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.shop) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  const status = String(form.get("status") ?? "");

  // 表單來的字串一律先驗證過才進資料庫，否則 status 可以被寫成任何東西
  if (!id || !isShopStatus(status)) {
    return NextResponse.redirect(absoluteUrl(req, "/portal/orders?error=bad"), 303);
  }

  // 回傳的 count 就是授權檢查：不屬於本租戶的 id 更新不到任何一列
  const ok = await setShopOrderStatus(tenant.slug, id, status);
  if (!ok) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.redirect(absoluteUrl(req, `/portal/orders/${encodeURIComponent(id)}`), 303);
}
