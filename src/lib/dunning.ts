// 欠費催收的時程表與階段判斷。
//
// 抽成純函式而不是留在 cron 裡：這幾個數字決定「客戶第幾天會被關站」，
// 是這套機制唯一會出人命的部分，必須測得到。

/**
 * 各階段與其門檻天數（自第一次扣款失敗起算）。
 * 與服務條款第九條逐字對應——改這裡就要同步改條款，反之亦然。
 */
export const DUNNING_STAGES = [
  { stage: 1, day: 3 }, // 提醒
  { stage: 2, day: 7 }, // 預告暫停
  { stage: 3, day: 15 }, // 得暫停服務
  { stage: 4, day: 30 }, // 得終止契約
] as const;

export const MAX_DUNNING_STAGE = DUNNING_STAGES[DUNNING_STAGES.length - 1].stage;

/**
 * 依欠費天數算出「現在該送到第幾階」。
 *
 * 取已達到的最高階，而不是 currentStage + 1：伺服器停機或 cron 漏跑幾天時，
 * 補寄一封現況正確的信，勝過連寄三封把客戶帶回一週前的時間軸
 * （「7 天後將暫停」寄到時已經該暫停了，那封信只會製造混亂）。
 *
 * @returns 該送的階段；沒有新階段要送時回 0
 */
export function dueDunningStage(days: number, currentStage: number): number {
  const reached = DUNNING_STAGES.filter((s) => days >= s.day)
    .map((s) => s.stage)
    .pop();
  if (reached === undefined || reached <= currentStage) return 0;
  return reached;
}

/** 距離「得暫停服務」還有幾天（已過期則為 0），供預告信寫出具體天數 */
export const daysUntilSuspension = (days: number): number =>
  Math.max(0, DUNNING_STAGES[2].day - days);
