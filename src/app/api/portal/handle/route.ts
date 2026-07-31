import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { setHandled } from "@/lib/tenant-data";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  // getTenantSession 已同時比對 Host 與 cookie 內的 slug
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });

  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return new NextResponse("Bad Request", { status: 400 });
  }
  const handled = String(form.get("handled") ?? "1") === "1";

  // 回傳 false = 這筆不屬於本租戶。不透露它是否存在，一律回 404。
  const ok = await setHandled(tenant.slug, id, handled);
  if (!ok) return new NextResponse("Not Found", { status: 404 });

  return NextResponse.redirect(absoluteUrl(req, "/portal"), 303);
}
