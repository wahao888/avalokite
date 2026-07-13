import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { cancelPeriod } from "@/lib/ecpay";

// 後台一鍵終止定期定額扣款（呼叫綠界 CreditCardPeriodAction，Action=Cancel）
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!id) return NextResponse.redirect(`${site}/admin?suberr=badid`, 303);

  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) return NextResponse.redirect(`${site}/admin?suberr=notfound`, 303);
  if (sub.status === "cancelled") {
    return NextResponse.redirect(`${site}/admin`, 303);
  }

  try {
    const r = await cancelPeriod(sub.merchantTradeNo);
    await prisma.subscription.update({
      where: { id },
      data: r.success
        ? { status: "cancelled", cancelledAt: new Date(), cancelResult: r.raw.slice(0, 1000) }
        : { cancelResult: `FAIL ${r.rtnCode} ${r.rtnMsg}`.slice(0, 1000) },
    });
    return NextResponse.redirect(
      `${site}/admin${r.success ? "" : "?suberr=ecpay"}`,
      303
    );
  } catch (err) {
    console.error("[cancel-subscription]", err);
    await prisma.subscription.update({
      where: { id },
      data: { cancelResult: `ERROR ${String(err)}`.slice(0, 1000) },
    });
    return NextResponse.redirect(`${site}/admin?suberr=exception`, 303);
  }
}
