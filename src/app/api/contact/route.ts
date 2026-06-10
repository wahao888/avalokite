import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  service: z.string().trim().max(100).optional().or(z.literal("")),
  budget: z.string().trim().max(100).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(3000),
  locale: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
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
  await notifyOwner(
    `[Avalo] 新詢問單 #${inquiry.id} — ${d.name}`,
    `姓名：${d.name}\nEmail：${d.email}\n電話/LINE：${d.phone || "-"}\n公司：${d.company || "-"}\n服務：${d.service || "-"}\n預算：${d.budget || "-"}\n\n${d.message}`
  );
  return NextResponse.json({ ok: true });
}
