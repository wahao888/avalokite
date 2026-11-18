import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/portal-http";
import { fulfillReward, REFERRAL_SERVICES } from "@/lib/referral";
import { sendMail } from "@/lib/mail";

// 推薦獎勵（免費服務一次）交付之後的登記。只記錄做了哪一項與交付紀錄，
// 不碰訂閱、月費或綠界——這正是改成送服務的理由。
const schema = z.object({
  id: z.coerce.number().int().positive(),
  service: z.enum(REFERRAL_SERVICES.map((s) => s.key) as [string, ...string[]]),
  note: z.string().trim().min(2).max(500),
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
    const result = await prisma.$transaction((tx) => fulfillReward(tx, { id: d.id, service: d.service, note: d.note }));
    await sendMail({
      to: result.email,
      subject: "[Avalo] 推薦獎勵服務已完成 / Referral reward delivered",
      text:
        `您的推薦獎勵「${result.service.zh.name}」已完成交付，感謝您的推薦。\n\n` +
        `Your referral reward "${result.service.en.name}" has been delivered. Thank you for the referral.\n\nAvalo`,
    });
    return back("done=1");
  } catch (error) {
    console.error("[referral fulfilment]", error instanceof Error ? error.message : "failed");
    return back("error=unavailable");
  }
}
