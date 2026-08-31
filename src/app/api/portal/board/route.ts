import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTenantSession } from "@/lib/tenant-auth";
import { saveFlavorBoard } from "@/lib/tenant-data";
import { absoluteUrl, sameOrigin } from "@/lib/portal-http";
import { flavorSlugs } from "@/app/sites/monsieurlong/_data/flavors";

const MAX_EXTRAS = 12;
const MAX_EXTRA_LEN = 40;
const MAX_NOTE = 120;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Bad Request", { status: 400 });

  // getTenantSession 已同時比對 Host 與 cookie 內的 slug
  const tenant = await getTenantSession();
  if (!tenant) return new NextResponse("Unauthorized", { status: 401 });
  if (!tenant.flavorBoard) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData();

  // 只接受確實存在於口味目錄的 slug。使用者送什麼進來都不信任——
  // 存進去的髒 slug 會在前台被安靜略過，但清單會愈積愈亂。
  const known = new Set(await flavorSlugs());
  const slugs = form
    .getAll("slug")
    .map((v) => String(v))
    .filter((s) => known.has(s));

  const extras = String(form.get("extras") ?? "")
    .split("\n")
    .map((s) => s.trim().slice(0, MAX_EXTRA_LEN))
    .filter(Boolean)
    .slice(0, MAX_EXTRAS);

  const note = String(form.get("note") ?? "").trim().slice(0, MAX_NOTE) || null;

  await saveFlavorBoard(tenant.slug, { slugs, extras, note });

  // 首頁與口味頁是 ISR（revalidate 60），這裡主動失效，
  // 讓店家按下儲存後重新整理官網就是新的，不用等一分鐘。
  for (const p of ["/", "/flavors"]) {
    revalidatePath(`/sites/${tenant.slug}${p === "/" ? "" : p}`);
  }

  return NextResponse.redirect(absoluteUrl(req, "/portal/board?saved=1"), 303);
}
