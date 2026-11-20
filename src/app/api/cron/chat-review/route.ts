import { NextRequest, NextResponse } from "next/server";
import { runChatReview } from "@/lib/chat-review";

export const dynamic = "force-dynamic";

// 每週一寄一封「AI 客服答不好的問題」。只讀不寫。
//
//   0 1 * * 1 /opt/avalo/app/deploy/run-cron.sh chat-review >> /opt/avalo/cron-chat-review.log 2>&1
//
// 加上 ?dry=1 只回傳內容、不寄信，手動查看用。
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const r = await runChatReview(new Date(), !dry);
  return NextResponse.json({ sent: !dry, conversations: r.conversations, items: r.items.length, subject: r.subject, text: r.text });
}

export const GET = handle;
export const POST = handle;
