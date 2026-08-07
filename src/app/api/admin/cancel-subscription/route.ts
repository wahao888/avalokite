import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { cancelSubscription, findSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

// 後台一鍵終止定期定額扣款。實際邏輯與客戶自助終止共用 lib/subscription，
// 兩邊都會呼叫綠界終止、作廢待付授權、重算訂單狀態並通知站方。
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
    const r = await cancelSubscription(sub, "admin");
    return NextResponse.redirect(`${site}/admin${r.ok ? "" : "?suberr=ecpay"}`, 303);
  } catch (err) {
    console.error("[cancel-subscription]", err);
    await prisma.subscription.update({
      where: { id },
      data: { cancelResult: `ERROR ${String(err)}`.slice(0, 1000) },
    });
    return NextResponse.redirect(`${site}/admin?suberr=exception`, 303);
  }
}
