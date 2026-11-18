import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/portal-http";
import { redeemCareReward } from "@/lib/referral";
import { sendMail } from "@/lib/mail";

const schema = z.object({
  id: z.coerce.number().int().positive(),
  mtn: z.string().regex(/^[A-Z0-9]{4,20}$/),
  freeFrom: z.iso.date(),
  billingReference: z.string().trim().min(5).max(500),
  confirmed: z.literal("yes"),
});

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const back = (query: string) => NextResponse.redirect(`${site}/admin/referrals?${query}`, 303);
  const parsed = schema.safeParse(Object.fromEntries((await req.formData()).entries()));
  if (!parsed.success) return back("error=invalid");
  const d = parsed.data;
  try {
    const from = new Date(`${d.freeFrom}T00:00:00+08:00`);
    const result = await prisma.$transaction((tx) => redeemCareReward(tx, {
      id: d.id, mtn: d.mtn, freeFrom: from, billingReference: d.billingReference,
    }));
    const until = result.freeUntil.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
    await sendMail({ to: result.email, subject: "[Avalo] 免費維護月份已安排 / Free care month scheduled",
      text: `您的推薦獎勵已安排：${d.freeFrom} 至 ${until} 提供免費維護，該期間不收月費。到期日起恢復原方案收費，不延長最短承諾期。\n\n` +
        `Your free care month is scheduled from ${d.freeFrom} until ${until} (Taipei time). No care fee applies during this period. ` +
        `Regular billing resumes at the end; your minimum term is unchanged.\n\nAvalo`,
    });
    return back("done=1");
  } catch (error) {
    console.error("[referral redemption]", error instanceof Error ? error.message : "failed");
    return back("error=unavailable");
  }
}
