import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/mail";

// 文山木材行 線上估價單
// 儲存沿用 Inquiry（service 作為來源識別），通知信寄 MAIL_OWNER

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

// 簡易 in-memory rate limit（單機 node 部署，夠用）
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  // 防止 Map 無限增長
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
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

  const inquiry = await prisma.inquiry.create({
    data: {
      name: d.name,
      email: d.email || "",
      phone: d.phone,
      company: [d.venue, d.projectType].filter(Boolean).join("／") || null,
      service: "文山木材行報價",
      budget: d.region || null,
      message,
      locale: "zh-TW",
    },
  });

  await notifyOwner(
    `[文山木材行] 新估價單 #${inquiry.id} — ${d.name}${d.venue ? `（${d.venue}）` : ""}`,
    [
      `姓名：${d.name}`,
      `電話：${d.phone}`,
      `Email：${d.email || "-"}`,
      `場域／工程：${[d.venue, d.projectType].filter(Boolean).join("／") || "-"}`,
      "",
      message,
    ].join("\n"),
  );

  return NextResponse.json({ ok: true });
}
