import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredChat } from "@/lib/chat-stats";

export const dynamic = "force-dynamic";

// 刪掉超過保留期的對話紀錄與 webhook 去重列。
//
// 隱私權政策寫了對話紀錄保留兩年——沒有東西真的去刪，那句話就只是文案。
// 用 POST：這支會刪資料，不能讓預抓或爬蟲以 GET 誤觸。
//
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://127.0.0.1:3000/api/cron/retention
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const removed = await purgeExpiredChat();
  if (removed.messages > 0 || removed.conversations > 0) {
    console.warn(
      `[retention] 清除逾期對話：訊息 ${removed.messages} 則、對話 ${removed.conversations} 筆`,
    );
  }
  return NextResponse.json(removed);
}
