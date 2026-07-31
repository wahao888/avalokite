import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTenant } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { getTenant } from "@/lib/tenants";

// 文山木材行 線上估價單
//
// 租戶由「路徑常數」決定，不看 Host：API 不經過 proxy.ts 的 Host 改寫，
// 而 Host 是使用者可控的輸入，拿它決定資料要寫進誰的帳戶等於開後門。
const TENANT = getTenant("wenshan")!;

const schema = z.object({
  venue: z.string().trim().max(50).optional().or(z.literal("")),
  projectType: z.string().trim().max(50).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        qty: z.string().trim().max(200).optional().or(z.literal("")),
      }),
    )
    .max(60)
    .optional(),
  note: z.string().trim().max(3000).optional().or(z.literal("")),
  region: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  date: z.string().trim().max(20).optional().or(z.literal("")),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(50),
  lineId: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  // honeypot
  website: z.string().max(500).optional().or(z.literal("")),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export async function POST(req: NextRequest) {
  // key 帶 tenant：一家客戶被灌爆不影響其他客戶站的表單
  if (rateLimited(`quote:${TENANT.slug}:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const d = parsed.data;

  // Honeypot：機器人填了隱藏欄位 → 假裝成功、不落庫不寄信
  if (d.website) {
    return NextResponse.json({ ok: true });
  }

  const itemLines =
    d.items && d.items.length > 0
      ? d.items.map((i) => `・${i.name}${i.qty ? `：${i.qty}` : ""}`).join("\n")
      : "（未勾選，見備註）";

  const message = [
    "【材料清單】",
    itemLines,
    "",
    d.note ? `【備註】\n${d.note}\n` : null,
    "【配送】",
    `區域：${d.region || "-"}`,
    d.address ? `地址：${d.address}` : null,
    d.date ? `期望到貨日：${d.date}` : null,
    "",
    "【聯絡】",
    `LINE：${d.lineId || "-"}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  // 先落庫再寄信：SMTP 掛掉時客戶後台仍看得到單，不會漏。
  const inquiry = await prisma.inquiry.create({
    data: {
      tenantId: TENANT.slug,
      name: d.name,
      email: d.email || "",
      phone: d.phone,
      company: [d.venue, d.projectType].filter(Boolean).join("／") || null,
      service: "線上估價單",
      budget: d.region || null,
      message,
      payload: JSON.stringify(d),
      locale: "zh-TW",
    },
  });

  const notified = await notifyTenant(TENANT, {
    subject: `[${TENANT.name}] 新估價單 #${inquiry.id} — ${d.name}${d.venue ? `（${d.venue}）` : ""}`,
    // 提交者填了 email 才設 Reply-To，讓老闆按「回覆」就能直接回客人
    replyTo: d.email || undefined,
    text: [
      `姓名：${d.name}`,
      `電話：${d.phone}`,
      `Email：${d.email || "-"}`,
      `場域／工程：${[d.venue, d.projectType].filter(Boolean).join("／") || "-"}`,
      "",
      message,
    ].join("\n"),
  });

  // 記錄通知信是否真的送出；後台會把未送達的單標記出來
  if (notified) {
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { notified: true } });
  }

  return NextResponse.json({ ok: true });
}
