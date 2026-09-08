import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getTenant, tenantOrigin } from "@/lib/tenants";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { notifyTenant } from "@/lib/mail";
import { getSettlementByToken, reportRemit } from "@/lib/daigou-data";

// 匯款回報。客人從通知文字裡的 /s/<token> 連結進來，填末五碼。
//
// 這一支是「客人 → Amber」方向唯一的閉環：沒有它，她就要在 LINE 裡
// 一則一則對帳，而末五碼會散在幾十則訊息裡。

export const dynamic = "force-dynamic";

const TENANT = getTenant("amber")!;
const RATE = { windowMs: 10 * 60_000, max: 10 };

const Schema = z.object({
  token: z.string().trim().min(10).max(64),
  last5: z.string().trim().regex(/^\d{5}$/),
  remitName: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`remit:${TENANT.slug}:${clientIp(req)}`, RATE)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const s = await getSettlementByToken(TENANT.slug, parsed.data.token);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  // 已出貨／已完成的結單不再接受回報——那時候錢早就收完了，
  // 再寫進去只會覆蓋掉當初核帳的紀錄。
  if (s.status === "shipped" || s.status === "done" || s.status === "cancelled") {
    return NextResponse.json({ error: "closed" }, { status: 400 });
  }

  const ok = await reportRemit(
    TENANT.slug,
    s.id,
    parsed.data.last5,
    parsed.data.remitName || null,
  );
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  await notifyTenant(TENANT, {
    subject: `匯款回報 ${s.id}／${s.member.name ?? ""}／末五碼 ${parsed.data.last5}`,
    text: [
      `結單編號：${s.id}`,
      `客人：${s.member.name ?? "（未填）"}（${s.member.phoneDigits ?? ""}）`,
      `匯款末五碼：${parsed.data.last5}`,
      parsed.data.remitName ? `匯款人：${parsed.data.remitName}` : null,
      `應付金額：${s.payableAmount}`,
      "",
      `後台：${tenantOrigin(TENANT)}/portal/amber`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ ok: true });
}
