// AI 客服的單價與費用換算。純函式，沒有資料庫。
//
// 為什麼單獨一檔：費用上限那道閘和後台報表都要把 token 換成錢。單價各自寫一份，
// 換模型時改了一邊忘了另一邊，就會出現「後台說花了 3 塊、閘門以為花了 30 塊」
// 這種對不起來的數字，而且是閘門那邊先出事——它會提早把客服關掉。

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
}

/**
 * 每百萬 token 的單價（美元），預設是 gpt-6-luna 的牌價。
 * 換模型時要一起改，否則費用上限會用錯的單價估錢——估低了就擋不住。
 */
export const PRICE_IN = Number(process.env.AI_PRICE_IN || 0.1);
export const PRICE_CACHED = Number(process.env.AI_PRICE_CACHED || 0.01);
export const PRICE_OUT = Number(process.env.AI_PRICE_OUT || 0.5);

/**
 * token 數 → 估算美元。
 *
 * cacheRead 是 input 的子集而不是另一筆：不先扣掉就會用全額單價把快取命中的
 * 部分再算一次，估出來的錢比實際高一個量級（我們的快取命中率在九成以上）。
 * 另一方面 clamp 也是必要的——萬一上游回報的 cacheRead 大於 input，
 * 沒有 clamp 就會算出負數的費用，帳面上反而像在賺錢。
 */
export function estimateCostUsd(u: TokenUsage): number {
  const cached = Math.min(u.cacheRead, u.input);
  const uncached = Math.max(0, u.input - cached);
  return (uncached * PRICE_IN + cached * PRICE_CACHED + u.output * PRICE_OUT) / 1_000_000;
}

/** 報表顯示用：美元轉新台幣的概估匯率。帳單是美元計價，這只是給人看的量級。 */
export const USD_TO_TWD = Number(process.env.AI_USD_TWD || 32);
