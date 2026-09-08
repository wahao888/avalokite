// 收單截止。純函式，前台、後台與下單 API 共用同一份判斷。
//
// 住在 lib 而不是 sites/amber/_data，是因為 daigou-data.ts 在下單的交易裡
// 也要用它做最後一次權威判斷。反過來讓 lib 去 import app 是錯的相依方向，
// 而把規則複製一份到 lib 更糟——「能不能下單」的判斷分岔，就是收到不該收的單。
//
// 核心設計：「已截止」是 (deadline, now) 的算術，**不是存在資料庫裡的旗標**。
//
// 為什麼不用 cron 去翻一個 closed 欄位：
//   ① 那會製造一段「資料庫說開著、事實已截止」的時間窗，而那段時間收進來的
//      單是真的要出貨的；
//   ② 多一種故障模式——cron 死了，全站商品就永遠開著，而且沒人會發現。
// 推導沒有這兩個問題，代價只是每次讀取多算一次減法。

export type DeadlineProduct = {
  /** null＝繼承檔期 */
  deadlineAt: Date | null;
  /** draft | live | hidden */
  status: string;
};

export type DeadlineBatch = {
  defaultDeadlineAt: Date | null;
  /** draft | open | closed | archived */
  status: string;
};

export type OrderState =
  | { open: true; deadline: Date | null }
  | { open: false; reason: "expired" | "batch-closed" | "not-live"; deadline: Date | null };

export const ORDER_STATE_ZH: Record<"expired" | "batch-closed" | "not-live", string> = {
  expired: "已截止",
  "batch-closed": "本檔已收單",
  "not-live": "已下架",
};

/**
 * 這件商品實際的收單時間。
 * 商品沒設就繼承檔期；兩者都沒設＝**永不截止**（「現貨」分類需要這個）。
 */
export function effectiveDeadline(
  product: DeadlineProduct,
  batch: DeadlineBatch,
): Date | null {
  return product.deadlineAt ?? batch.defaultDeadlineAt ?? null;
}

/**
 * 現在還能不能下這件商品。
 *
 * 檢查順序是刻意的：先看商品自己是不是上架中，再看檔期，最後才看時間。
 * 這樣回傳的 reason 是「最根本的那個原因」——一件草稿商品在一個已收單的
 * 檔期裡，該說的是「已下架」而不是「本檔已收單」。
 */
export function orderState(
  product: DeadlineProduct,
  batch: DeadlineBatch,
  now: Date,
): OrderState {
  const deadline = effectiveDeadline(product, batch);

  if (product.status !== "live") return { open: false, reason: "not-live", deadline };
  if (batch.status !== "open") return { open: false, reason: "batch-closed", deadline };

  // 到點就算截止（>=）。寫 23:00 的意思是「23:00 之後不收」，
  // 不是「23:00:00.999 還可以擠一單」。
  if (deadline && now.getTime() >= deadline.getTime()) {
    return { open: false, reason: "expired", deadline };
  }
  return { open: true, deadline };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * 倒數文字：「剩 3 天」「剩 6 小時」「剩 12 分鐘」「已截止」。
 *
 * ⚠ 這個函式**只在客戶端掛載後呼叫**。伺服器渲染的是絕對時間
 * （formatTaipei），因為倒數的值每秒都在變，伺服器與首次客戶端渲染
 * 一定對不起來 → hydration mismatch。
 */
export function countdownLabel(deadline: Date, now: Date): string {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "已截止";
  if (ms >= DAY) return `剩 ${Math.floor(ms / DAY)} 天`;
  if (ms >= HOUR) return `剩 ${Math.floor(ms / HOUR)} 小時`;
  if (ms >= MIN) return `剩 ${Math.floor(ms / MIN)} 分鐘`;
  return "即將截止";
}

/** 是否進入「快截止了」的警示區間（前台標紅用）。預設 24 小時內 */
export function isClosingSoon(deadline: Date, now: Date, withinMs = DAY): boolean {
  const ms = deadline.getTime() - now.getTime();
  return ms > 0 && ms <= withinMs;
}
