// LINE webhook 的共用處理。主站與每一個客戶站各有自己的官方帳號，
// 但收到事件之後要做的事一模一樣，差別只有「用哪一組憑證、記到哪一個租戶」。
//
// 抽成一支而不是複製兩份：簽章驗證、背景處理、reply token 的時效、
// 去重——這幾件只要有一邊漏掉，那個站就會安靜地壞掉，而且是壞在客人面前。

import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyText, pushText, startLoading, getDisplayName, type LineCreds, type LineEvent } from "@/lib/line";
import { handleMessageDetailed, handleMedia, lineMuted, welcomeMessage, type MediaKind } from "@/lib/chat-service";
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
    void inOrder(`${opts.tenantId}:${event.source?.userId ?? "?"}`, () => processEvent(event, opts));
  }
  return NextResponse.json({ ok: true });
}

const MEDIA_KINDS = new Set<MediaKind>(["sticker", "image", "video", "audio", "file", "location"]);

/**
 * 同一位客人的事件排隊、一則處理完才處理下一則。
 *
 * 客人常常連傳好幾句（「你好」「我想問官網」「大概多少錢」）。同時處理的話，
 * 三次 AI 呼叫讀到的對話紀錄都不完整、各自回答，回覆順序還可能顛倒。
 * 本站是 EC2 上單一常駐 node process，用記憶體裡的 Promise 鏈就夠了；
 * 哪天改成多台或 serverless，這裡要換成資料庫鎖或佇列。
 */
const queues = new Map<string, Promise<void>>();
export function inOrder(key: string, job: () => Promise<void>): Promise<void> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(job, job);
  queues.set(key, next);
  // 隊伍清空就把 key 拿掉，不然每一位來過的客人都會在記憶體裡留一筆
  // 結尾的 catch：job 失敗時 finally 產生的新 Promise 也會失敗，沒人接就是 unhandled rejection
  next
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    })
    .catch(() => {});
  return next;
}

/**
 * 回覆；reply token 失效（排隊太久、AI 太慢超過約一分鐘）時改用推播補送。
 * 推播會用掉官方帳號的免費則數，所以只在 reply 失敗時才用——客人收不到回覆，
 * 比多用一則額度糟得多。
 */
async function send(
  replyToken: string,
  userId: string,
  text: string,
  creds: LineCreds,
  quickReplies: string[] = [],
): Promise<void> {
  if (await replyText(replyToken, text, creds, quickReplies)) return;
  console.warn("[line/webhook] reply 失敗，改用推播補送");
  await pushText(userId, text, creds, quickReplies);
}

async function processEvent(
  event: LineEvent,
  { tenantId, creds }: { tenantId: string; creds: LineCreds },
) {
  try {
    const userId = event.source?.userId;
    if (!userId || !event.replyToken) return;
    // 只服務一對一聊天。官方帳號被拉進群組時，不能對群組裡的每一句話都回答
    // （也不該把群組成員的對話存進客服紀錄）。
    if (event.source?.type !== "user") return;

    // 加好友（含解除封鎖）：送歡迎詞與按鈕
    if (event.type === "follow") {
      if (!(await claimEvent(event))) return;
      const name = await getDisplayName(userId, creds);
      const w = welcomeMessage(tenantId, name);
      await send(event.replyToken, userId, w.text, creds, w.quickReplies);
      return;
    }

    if (event.type !== "message" || !event.message) return;

    // 貼圖、圖片等 AI 讀不到的訊息：固定回覆或轉專人，不呼叫模型
    if (event.message.type !== "text") {
      const kind = event.message.type as MediaKind;
      if (!MEDIA_KINDS.has(kind)) return;
      if (!(await claimEvent(event))) return;
      const displayName = await getDisplayName(userId, creds);
      const reply = await handleMedia({ tenantId, channel: "line", externalId: userId, displayName }, kind);
      if (reply) await send(event.replyToken, userId, reply.text, creds, reply.quickReplies);
      return;
    }

    if (!(await claimEvent(event))) return;
    const text = event.message.text?.trim();
    if (!text) return;

    // 先開「輸入中」動畫再去做慢的事。不 await：它失敗不該擋住回覆。
    // 真人接手（靜音）時不開——AI 不會回，動畫轉完什麼都沒有，看起來像當機。
    if (!(await lineMuted(tenantId, userId))) {
      void startLoading(userId, creds);
    }

    const displayName = await getDisplayName(userId, creds);
    const reply = await handleMessageDetailed({
      tenantId,
      channel: "line",
      externalId: userId,
      displayName,
      text,
    });
    // null = 真人已接手，AI 這輪不說話。reply token 就讓它過期，不送任何訊息。
    if (reply) await send(event.replyToken, userId, reply.text, creds, reply.quickReplies);
  } catch (err) {
    // 背景工作沒有人接 promise，不自己 catch 就會變成 unhandled rejection。
    console.error(`[line/webhook] ${tenantId} 處理事件失敗`, err);
  }
}
