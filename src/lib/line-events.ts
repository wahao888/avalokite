import { prisma } from "@/lib/prisma";
import type { LineEvent } from "@/lib/line";

/** 去重表清理的呼叫計數。LINE 的重送只發生在事發後很短的時間內，舊紀錄留著沒用。 */
let sinceSweep = 0;
const SWEEP_EVERY = 200;
const KEEP_DAYS = 7;

/**
 * 認領這個事件，回 true 代表「沒人處理過，交給你」。
 *
 * LINE 的 Webhook redelivery 會把我們沒回 200 的事件重送一次——那正是部署
 * restart 那幾秒掉的訊息，是該接住的。但從事件本身看不出「我們根本沒收到」
 * 與「我們處理完了只是回應超時」的差別，所以不能照 isRedelivery 一律略過
 * （那等於放棄重送）也不能一律處理（客人會看到重複回覆）。
 *
 * 用 webhookEventId 當主鍵硬寫：寫得進去就是第一次，撞到 unique 就是做過了。
 * 刻意用 create 的唯一鍵當鎖，而不是先查再寫——後者在同一事件被併發重送時
 * 兩邊都會查到「沒有」，然後都去回覆。
 *
 * 沒帶 id 的事件（理論上不會有）就照常處理，寧可重複也不要漏。
 */
export async function claimEvent(event: LineEvent): Promise<boolean> {
  const eventId = event.webhookEventId;
  if (!eventId) return true;
  try {
    await prisma.lineWebhookEvent.create({ data: { eventId } });
    if (++sinceSweep >= SWEEP_EVERY) {
      sinceSweep = 0;
      const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000);
      // 不 await：這是清垃圾，不該讓客人多等，失敗了下次還會再掃
      void prisma.lineWebhookEvent
        .deleteMany({ where: { createdAt: { lt: cutoff } } })
        .catch((err) => console.error("[line-events] 清理舊事件失敗", err));
    }
    return true;
  } catch {
    return false;
  }
}
