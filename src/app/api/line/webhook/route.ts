import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
  replyText,
  getDisplayName,
  type LineEvent,
} from "@/lib/line";
import { handleMessage } from "@/lib/chat-service";
import { claimEvent } from "@/lib/line-events";

// 這條路由永遠要跑在 Node 執行環境：簽章驗證用的是 node:crypto。
export const runtime = "nodejs";

/**
 * LINE Messaging API 的 webhook。
 *
 * LINE 只給這支約一秒的時間回 200，超過就記成送達失敗並可能重送。
 * AI 回覆要好幾秒，所以這裡收下事件就立刻回 200，真正的處理丟到背景跑
 * ——replyToken 有約一分鐘的有效期，來得及。
 * （本站是 EC2 上常駐的 node process，回應送出後背景工作不會被砍掉；
 * 若哪天改成 serverless，這裡要換成工作佇列。）
 */
export async function POST(req: NextRequest) {
  // 簽章必須用原始字串計算，不能先 json() 再 stringify 回去。
  const raw = await req.text();
  if (!verifyLineSignature(raw, req.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = (JSON.parse(raw) as { events?: LineEvent[] }).events ?? [];
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // LINE 後台「驗證」按鈕送的是空事件，照樣要回 200 才算通過。
  for (const event of events) {
    void processEvent(event);
  }
  return NextResponse.json({ ok: true });
}

async function processEvent(event: LineEvent) {
  try {
    if (event.type !== "message" || event.message?.type !== "text") return;
    if (!(await claimEvent(event))) return;

    const userId = event.source?.userId;
    const text = event.message.text?.trim();
    if (!userId || !text || !event.replyToken) return;

    const displayName = await getDisplayName(userId);
    const reply = await handleMessage({
      channel: "line",
      externalId: userId,
      displayName,
      text,
    });
    // null = 真人已接手，AI 這輪不說話。reply token 就讓它過期，不送任何訊息。
    if (reply) await replyText(event.replyToken, reply);
  } catch (err) {
    // 背景工作沒有人接 promise，不自己 catch 就會變成 unhandled rejection。
    console.error("[line/webhook] 處理事件失敗", err);
  }
}
