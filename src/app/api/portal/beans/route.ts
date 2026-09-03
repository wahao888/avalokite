import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTenantSession } from "@/lib/tenant-auth";
import { saveBeanStock } from "@/lib/tenant-data";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import { beanSlugs } from "@/app/sites/rekat/_data/beans";

const MAX_NOTE = 120;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  // getTenantSession 已同時比對 Host 與 cookie 內的 slug
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.shop) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();

  // 只接受確實存在於豆單目錄的 slug。表單送什麼進來都不信任——
  // 存進去的髒 slug 在前台會被安靜略過，但清單會愈積愈亂。
  const soldOut: string[] = [];
  const hidden: string[] = [];
  for (const slug of beanSlugs()) {
    const v = String(form.get(`s:${slug}`) ?? "on");
    if (v === "soldout") soldOut.push(slug);
    else if (v === "hidden") hidden.push(slug);
  }

  const note = String(form.get("note") ?? "").trim().slice(0, MAX_NOTE) || null;

  await saveBeanStock(tenant.slug, { soldOut, hidden, note });

  // 前台讀狀態的頁面都是 force-dynamic，理論上不需要失效；
  // 但 Next 仍可能在同一次請求週期內快取 fetch 結果，這裡主動清一次比較保險。
  for (const p of ["", "/beans"]) {
    revalidatePath(`/sites/${tenant.slug}${p}`);
  }

  return NextResponse.redirect(absoluteUrl(req, "/portal/beans?saved=1"), 303);
}
