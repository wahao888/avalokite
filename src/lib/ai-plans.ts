// AI 客服的三個方案等級 —— 界線、上限與對應 SKU 的唯一來源。
//
// 為什麼要有這一檔：同一組數字會出現在四個地方——定價頁的方案內容、/llms.txt、
// AI 客服自己的知識庫，以及真正在擋量的那道閘。寫四份的下場是定價頁寫「每月
// 5,000 組對話」、閘門設在 1,000，客人在第 1,001 組對話時看到「客服忙線中」，
// 而你手上那張表說他還有四千組可以用。
//
// 刻意不建 DB table：方案界線跟價目表一樣本來就住在程式碼裡、改了本來就要重
// 部署，多一份 DB 記錄只會多一個真實來源。租戶要用哪一階寫在 tenants.ts。
//
// ⚠ 這裡的上限不是計費單位。實測每段對話的模型成本約 NT$0.011，就算一個月
// 兩萬組對話也只佔月費 1.5%——上限的用途是「超過這個量我們要找客人談」，
// 以及擋住被機器人灌爆的帳單，不是拿來跟客人收錢的。

export type AiPlanTier = "lite" | "business" | "enterprise";

export interface AiPlan {
  tier: AiPlanTier;
  /** 建置方案的 SKU（products.ts） */
  buildSku: string;
  /** 月費方案的 SKU（products.ts） */
  careSku: string;
  /** 每月對話組數上限（一組對話＝一個客人的一段往返） */
  monthlyConversations: number;
  /**
   * 每月模型費用上限（美元）。照實測成本換算後再留寬裕：
   * 真的打到這個數字，代表量暴增或被灌，兩種都該有人看一眼。
   */
  monthlyBudgetUsd: number;
  /** 開通的通道數：1 = LINE 或官網擇一 */
  channels: number;
  /** 知識庫規模的量級（字數），用於文案與驗收界線 */
  knowledgeChars: number;
  /** 知識庫更新頻率 */
  updateCadence: "quarterly" | "monthly" | "ondemand";
}

export const AI_PLANS: Record<AiPlanTier, AiPlan> = {
  lite: {
    tier: "lite",
    buildSku: "ai-chatbot-lite",
    careSku: "care-ai-lite",
    monthlyConversations: 1_000,
    monthlyBudgetUsd: 3,
    channels: 1,
    knowledgeChars: 10_000,
    updateCadence: "quarterly",
  },
  business: {
    tier: "business",
    buildSku: "ai-chatbot",
    careSku: "care-ai",
    monthlyConversations: 5_000,
    monthlyBudgetUsd: 10,
    channels: 2,
    knowledgeChars: 120_000,
    updateCadence: "monthly",
  },
  enterprise: {
    tier: "enterprise",
    buildSku: "ai-chatbot-enterprise",
    careSku: "care-ai-plus",
    monthlyConversations: 20_000,
    monthlyBudgetUsd: 40,
    channels: 4,
    knowledgeChars: 1_000_000,
    updateCadence: "ondemand",
  },
};

export const AI_PLAN_ORDER: AiPlanTier[] = ["lite", "business", "enterprise"];

/**
 * 每日 AI 回覆則數上限。
 *
 * 用月上限推算而不是另外設一個數字：兩個各自維護的數字遲早會互相矛盾。
 * 取「平均每日的三倍」是刻意的——真實流量是波動的（活動、節慶、被報導），
 * 抓剛好等於平均值會在正常的尖峰日就把客服關掉，那比沒有上限更糟。
 * 月上限仍然擋得住整個月的累積，這一道只擋單日暴衝。
 */
export const dailyReplyCap = (plan: AiPlan) =>
  Math.ceil((plan.monthlyConversations * 3) / 30) * 3;

export const planOf = (tier: AiPlanTier): AiPlan => AI_PLANS[tier];

/** 由建置 SKU 反查方案等級，定價頁與知識庫用 */
export const planByBuildSku = (sku: string): AiPlan | undefined =>
  AI_PLAN_ORDER.map((t) => AI_PLANS[t]).find((p) => p.buildSku === sku);
