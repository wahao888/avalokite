import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyTenant } from "@/lib/mail";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { getTenant } from "@/lib/tenants";

// Monsieur Long 隆先生 — 合作邀請與訂購詢問
//
// 租戶由「路徑常數」決定，不看 Host：API 不經過 proxy.ts 的 Host 改寫，
// 而 Host 是使用者可控的輸入，拿它決定資料要寫進誰的帳戶等於開後門。
const TENANT = getTenant("monsieurlong")!;

const KIND_LABEL = {
  collab: "合作邀請",
  custom: "伴手禮・客製化蛋糕",
} as const;

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const schema = z.object({
  kind: z.enum(["collab", "custom"]),
  type: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  company: optional(120),
  email: z.string().trim().email().max(200),
  phone: optional(50),
  social: optional(200),
  date: optional(60),
  place: optional(200),
  scale: optional(60),
  budget: optional(60),
  message: z.string().trim().min(5).max(3000),
  // honeypot
  website: z.string().max(500).optional().or(z.literal("")),
  // 前端頁面停留毫秒數，用來擋秒填秒送的機器人
  elapsed: z.number().int().min(0).max(86_400_000).optional(),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/** 人類看完表單、打完字不可能少於這個時間 */
const MIN_ELAPSED_MS = 3000;

export async function POST(req: NextRequest) {
  // key 帶 tenant：一家客戶被灌爆不影響其他客戶站的表單
  if (
    rateLimited(`inquiry:${TENANT.slug}:${clientIp(req)}`, {
      windowMs: WINDOW_MS,
      max: MAX_PER_WINDOW,
    })
  ) {
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

  // Honeypot 或秒填秒送 → 假裝成功、不落庫不寄信。
  // 回 200 是刻意的：回 400 等於告訴機器人「這招被擋了，換一招」。
  if (d.website || (d.elapsed !== undefined && d.elapsed < MIN_ELAPSED_MS)) {
    return NextResponse.json({ ok: true });
  }

  const kindLabel = KIND_LABEL[d.kind];
  const line = (label: string, v?: string) => (v ? `${label}：${v}` : null);

  const message = [
    `【${kindLabel}】${d.type}`,
    "",
    line("公司／品牌", d.company),
    line("Instagram／網站", d.social),
    line(d.kind === "collab" ? "活動日期" : "希望取貨日", d.date),
    line(d.kind === "collab" ? "地點" : "取貨方式", d.place),
    line(d.kind === "collab" ? "預估人數" : "數量", d.scale),
    line("預算", d.budget),
    "",
    d.kind === "collab" ? "【想做什麼】" : "【需求說明】",
    d.message,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  // 先落庫再寄信：SMTP 掛掉時客戶後台仍看得到單，不會漏。
  const inquiry = await prisma.inquiry.create({
    data: {
      tenantId: TENANT.slug,
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      company: d.company || null,
      service: kindLabel,
      budget: d.budget || null,
      message,
      payload: JSON.stringify(d),
      locale: "zh-TW",
    },
  });

  const notified = await notifyTenant(TENANT, {
    subject: `[Monsieur Long] ${kindLabel} #${inquiry.id} — ${d.name}${
      d.company ? `（${d.company}）` : ""
    }`,
    // 提交者一定有 email，直接讓店家按「回覆」就能回信
    replyTo: d.email,
    text: [
      `稱呼：${d.name}`,
      `Email：${d.email}`,
      `電話：${d.phone || "-"}`,
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
