// LINE webhook 的共用處理。主站與每一個客戶站各有自己的官方帳號，
// 但收到事件之後要做的事一模一樣，差別只有「用哪一組憑證、記到哪一個租戶」。
//
// 抽成一支而不是複製兩份：簽章驗證、背景處理、reply token 的時效、
// 去重——這幾件只要有一邊漏掉，那個站就會安靜地壞掉，而且是壞在客人面前。

import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyText, getDisplayName, type LineCreds, type LineEvent } from "@/lib/line";
import { handleMessage } from "@/lib/chat-service";
import { claimEvent } from "@/lib/line-events";

/**
 * 收下 LINE 的事件並立刻回 200。
 *
 * LINE 只給這支約一秒的時間回 200，超過就記成送達失敗並可能重送。
 * AI 回覆要好幾秒，所以真正的處理丟到背景跑——replyToken 有約一分鐘的
 * 有效期，來得及。
 * （本站是 EC2 上常駐的 node process，回應送出後背景工作不會被砍掉；
 * 若哪天改成 serverless，這裡要換成工作佇列。）
 */
export async function handleLineWebhook(
  req: NextRequest,
  opts: { tenantId: string; creds: LineCreds },
): Promise<NextResponse> {
  // 簽章必須用原始字串計算，不能先 json() 再 stringify 回去。
  const raw = await req.text();
  if (!verifyLineSignature(raw, req.headers.get("x-line-signature"), opts.creds)) {
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
    void processEvent(event, opts);
  }
  return NextResponse.json({ ok: true });
}

async function processEvent(
  event: LineEvent,
  { tenantId, creds }: { tenantId: string; creds: LineCreds },
) {
  try {
    if (event.type !== "message" || event.message?.type !== "text") return;
    if (!(await claimEvent(event))) return;

    const userId = event.source?.userId;
    const text = event.message.text?.trim();
    if (!userId || !text || !event.replyToken) return;

    const displayName = await getDisplayName(userId, creds);
    const reply = await handleMessage({
      tenantId,
      channel: "line",
      externalId: userId,
      displayName,
      text,
    });
    // null = 真人已接手，AI 這輪不說話。reply token 就讓它過期，不送任何訊息。
    if (reply) await replyText(event.replyToken, reply, creds);
  } catch (err) {
    // 背景工作沒有人接 promise，不自己 catch 就會變成 unhandled rejection。
    console.error(`[line/webhook] ${tenantId} 處理事件失敗`, err);
  }
}
