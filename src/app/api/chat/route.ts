import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/portal-http";
import { handleMessage } from "@/lib/chat-service";

export const runtime = "nodejs";

// 官網上的聊天視窗。和 LINE 走同一個 chat-service，所以兩邊講法一致。
//
// 每則都會打一次模型，所以這道限流不是防洗版而已，是防帳單：
// 沒有它，一支腳本就能讓任何人替我們把 API 額度跑完。
const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_WINDOW = 20;

const VISITOR_COOKIE = "avalo_chat";

const schema = z.object({
  message: z.string().trim().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  // 擋掉別的網站把我們的客服當免費 API 用。擋不住 curl（它不帶 origin 也不吃
  // CORS），所以這不是主要防線——主要防線是限流與每日上限；這只是讓最省事的
  // 那種濫用省不了事。
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (rateLimited(`chat:${clientIp(req)}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW })) {
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

  // 訪客 id 只是用來把同一個人的對話接起來，不是身分驗證，所以不簽章；
  // 但仍設 httpOnly，避免頁面上的第三方腳本讀到別人的對話識別碼。
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existing ?? crypto.randomUUID();

  // 官網不靜音（那裡沒有真人介面），所以這裡實際上永遠拿得到字串
  const reply = await handleMessage({
    channel: "web",
    externalId: visitorId,
    text: parsed.data.message,
  });

  const res = NextResponse.json({ reply: reply ?? "" });
  if (!existing) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
