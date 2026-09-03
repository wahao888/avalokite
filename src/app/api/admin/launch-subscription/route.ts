import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { findSubscription, markLaunched } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

// 後台「標記已上線」。含建置的訂單，月費的計時器是從這個按鈕才開始走的：
// 寫下上線日、以該日起算承諾期、並立刻寄出定期定額授權連結（見 lib/subscription）。
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.redirect(`${site}/admin?suberr=badid`, 303);

  const row = await prisma.subscription.findUnique({ where: { id } });
  const sub = row ? await findSubscription(row.merchantTradeNo) : null;
  if (!sub) return NextResponse.redirect(`${site}/admin?suberr=notfound`, 303);

  try {
    const r = await markLaunched(sub);
    return NextResponse.redirect(`${site}/admin${r.ok ? "?subok=launched" : `?suberr=${r.error}`}`, 303);
  } catch (err) {
    console.error("[launch-subscription]", err);
    return NextResponse.redirect(`${site}/admin?suberr=exception`, 303);
  }
}
