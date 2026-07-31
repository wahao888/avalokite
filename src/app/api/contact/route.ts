import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  service: z.string().trim().max(100).optional().or(z.literal("")),
  budget: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(3000),
  locale: z.string().max(10).optional(),
  // honeypot
  website: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  if (rateLimited(`contact:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
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

  const inquiry = await prisma.inquiry.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      company: d.company || null,
      service: d.service || null,
      budget: d.budget || null,
      message: d.message,
      locale: d.locale ?? "zh-TW",
    },
  });
  const notified = await notifyOwner(
    `[Avalo] 新詢問單 #${inquiry.id} — ${d.name}`,
    `姓名：${d.name}\nEmail：${d.email}\n電話/LINE：${d.phone || "-"}\n公司：${d.company || "-"}\n服務：${d.service || "-"}\n預算：${d.budget || "-"}\n\n${d.message}`
  );
  // 後台會把通知信未送達的單標記出來（SMTP 掛掉時仍不會漏單）
  if (notified) {
    await prisma.inquiry.update({ where: { id: inquiry.id }, data: { notified: true } });
  }
  return NextResponse.json({ ok: true });
}
