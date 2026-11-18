// 每日營運稽核：一組「今天有沒有事情要處理」的檢查。
//
// 為什麼不寫在 deploy/daily-report.sh 裡：那支是 root 跑的 bash，要讀這些東西
// 只能自己拼 SQL、自己 grep TypeScript 原始碼算檔期剩幾天。檔期的規則住在
// promo-window.ts、費用單價住在 chat-pricing.ts，在 bash 裡複製一份遲早會對不上。
// 所以應用層自己算，簡報只負責把結果印出來。
//
// ⚠ 要新增每日檢查項目時，就是加在這一檔的 runOpsAudit 裡。
// 加進去之後簡報與測試會自動帶到，不用再改 bash 或排版器。
//
// 這裡只讀不寫：稽核有副作用的話，就沒辦法在正式站上安心地重跑一次來看結果。

import { prisma } from "@/lib/prisma";
import { MONTHLY_BUDGET, monthlySpendUsd } from "@/lib/chat-service";
import { CHAT_RETENTION_DAYS } from "@/lib/chat-stats";
import { PROMO_WINDOW, currentDeadline, isExpired, seatsLeft } from "@/lib/promo-window";
import { getTenant, HOUSE_TENANT, TENANTS } from "@/lib/tenants";
import { planOf } from "@/lib/ai-plans";
import { invoiceEnvironment } from "@/lib/ecpay-invoice";

/** 0 = 正常、1 = 留意、2 = 今天就要處理 */
export type Severity = 0 | 1 | 2;

export interface OpsCheck {
  /** 穩定代號。簡報與測試都認這個，改了等於換一個檢查項 */
  id: string;
  label: string;
  /** 看到的數字或狀態，一句話說完 */
  value: string;
  level: Severity;
  /** 要做什麼。level 0 時寫「為什麼不用動」，不要留空 */
  action: string;
}

const DAY = 24 * 60 * 60 * 1000;
const days = (ms: number) => Math.floor(ms / DAY);

/** 合約承諾期剩這麼多天以內就該開始接觸續約 */
const COMMIT_NOTICE_DAYS = 90;
/** 訂單停在 pending 超過這麼多天，大概是結帳到一半跑掉或金流出事 */
const ORDER_STUCK_DAYS = 7;
/** 檔期剩這麼多天以內要決定續檔或收檔 */
const PROMO_NOTICE_DAYS = 7;
/** 付款失敗往回看幾天 */
const PAYMENT_FAILED_DAYS = 3;
/** 通知信沒寄出往回看幾天（更舊的已經在後台被看過了） */
const NOTIFY_LOOKBACK_DAYS = 7;
/** 客戶站訂單停在待確認超過這麼多天就提醒店家 */
const SHOP_PENDING_DAYS = 2;

const siteName = (tenantId: string | null | undefined) =>
  tenantId ? (getTenant(tenantId)?.name ?? tenantId) : "Avalo 主站";

export async function runOpsAudit(now: Date = new Date()): Promise<OpsCheck[]> {
  const checks: OpsCheck[] = [];
  const add = (c: OpsCheck) => checks.push(c);
  // 讀較新資料表的檢查包一層：某張表還沒套 migration、或單一查詢出錯時，
  // 只有這一項標成「沒跑成功」，其餘照常進信。否則整份稽核 500，
  // 簡報上待辦、金流、檔期全部變空白，反而什麼都看不到。
  const guard = async (id: string, label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      add({
        id,
        label,
        value: "查詢失敗",
        level: 1,
        action: `這一項今天沒跑成功（${err instanceof Error ? err.message.split("\n").filter(Boolean).pop() : "未知錯誤"}），其他項目不受影響。常見原因是資料庫還沒套用最新 migration`,
      });
    }
  };

  // ── 詢問單 ──────────────────────────────────────────────
  const openInquiries = await prisma.inquiry.findMany({
    where: { handled: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, tenantId: true, createdAt: true },
  });
  const oldestInquiryDays = openInquiries.length
    ? days(now.getTime() - openInquiries[0].createdAt.getTime())
    : 0;
  const bySite = new Map<string, number>();
  for (const q of openInquiries) {
    const name = siteName(q.tenantId);
    bySite.set(name, (bySite.get(name) ?? 0) + 1);
  }
  add({
    id: "inquiry-open",
    label: "未處理的詢問單",
    value: openInquiries.length
      ? `${openInquiries.length} 筆（最舊 ${oldestInquiryDays} 天）：` +
        [...bySite].map(([k, v]) => `${k} ${v}`).join("、")
      : "0 筆",
    level: openInquiries.length === 0 ? 0 : oldestInquiryDays >= 3 ? 2 : 1,
    action: openInquiries.length
      ? "到 /admin 回覆後按「標記已處理」；客戶站的到各自的 /portal"
      : "都回完了",
  });

  // ── AI 客服 ────────────────────────────────────────────
  const openHandoffs = await prisma.chatConversation.findMany({
    where: { handoff: true },
    orderBy: { handoffAt: "asc" },
    select: { id: true, channel: true, handoffAt: true },
  });
  const oldestHandoffH = openHandoffs[0]?.handoffAt
    ? Math.floor((now.getTime() - openHandoffs[0].handoffAt.getTime()) / 3_600_000)
    : 0;
  add({
    id: "chat-handoff",
    label: "AI 客服等你回的對話",
    value: openHandoffs.length
      ? `${openHandoffs.length} 筆（最舊 ${oldestHandoffH} 小時）`
      : "0 筆",
    // 超過一天沒回的轉接等於放生：客人當下是留了電話在等人打給他的
    level: openHandoffs.length === 0 ? 0 : oldestHandoffH >= 24 ? 2 : 1,
    action: openHandoffs.length
      ? "到 /admin/chat 看逐字稿，回完按「標記已處理」讓 AI 接回"
      : "沒有人在等",
  });

  const spend = await monthlySpendUsd(HOUSE_TENANT);
  const ratio = MONTHLY_BUDGET > 0 ? spend / MONTHLY_BUDGET : 0;
  add({
    id: "ai-budget",
    label: "AI 客服本月花費（主站）",
    value: `US$${spend.toFixed(4)} / 上限 US$${MONTHLY_BUDGET}（${Math.round(ratio * 100)}%）`,
    level: ratio >= 1 ? 2 : ratio >= 0.7 ? 1 : 0,
    action:
      ratio >= 1
        ? "已達上限，AI 客服這個月剩下的對話一律改成請客人留聯絡方式；要放寬改 .env 的 AI_MONTHLY_BUDGET_USD"
        : ratio >= 0.7
          ? "用量偏高，先確認是真客人還是有人在灌"
          : "在預算內",
  });

  // 客戶站各自一列。混在同一個數字裡的話，某個客戶的機器人被灌爆時，
  // 你只會看到「總花費變高」，不知道要打給誰。
  for (const t of TENANTS.filter((x) => x.aiSupport)) {
    const plan = planOf(t.aiSupport!.plan);
    const used = await monthlySpendUsd(t.slug);
    const r = plan.monthlyBudgetUsd > 0 ? used / plan.monthlyBudgetUsd : 0;
    add({
      id: `ai-budget-${t.slug}`,
      label: `AI 客服本月花費（${t.name}）`,
      value: `US$${used.toFixed(4)} / 上限 US$${plan.monthlyBudgetUsd}（${Math.round(r * 100)}%，${plan.tier} 方案）`,
      level: r >= 1 ? 2 : r >= 0.7 ? 1 : 0,
      action:
        r >= 1
          ? `已達上限，${t.name} 的客服本月剩餘對話一律改為請客人留聯絡方式。要放寬就是談升級方案。`
          : r >= 0.7
            ? `用量接近上限，先確認是真的成長還是被灌，必要時跟客戶談升級。`
            : "在方案額度內",
    });
  }

  // LINE webhook 是「沒有消息不代表沒事」的那種東西：token 被撤銷、
  // webhook 被關掉、憑證換了，症狀都是安安靜靜地沒有任何事件進來。
  const since7 = new Date(now.getTime() - 7 * DAY);
  const yesterday = new Date(now.getTime() - DAY);
  const [events7, eventsYesterday] = await Promise.all([
    prisma.lineWebhookEvent.count({ where: { createdAt: { gte: since7 } } }),
    prisma.lineWebhookEvent.count({ where: { createdAt: { gte: yesterday } } }),
  ]);
  add({
    id: "line-webhook",
    label: "LINE webhook 事件",
    value: `昨天 ${eventsYesterday} 件 / 近七天 ${events7} 件`,
    // 近七天完全沒有，就只是還沒人用，不該每天報一次
    level: events7 > 0 && eventsYesterday === 0 ? 1 : 0,
    action:
      events7 > 0 && eventsYesterday === 0
        ? "前幾天還有、昨天整天掛零。到 LINE Developers Console 確認 Webhook 仍為啟用、access token 沒過期"
        : events7 > 0
          ? "有在收事件"
          : "近七天沒有人用 LINE 客服，不是異常",
  });

  const retentionCutoff = new Date(now.getTime() - CHAT_RETENTION_DAYS * DAY);
  const staleMessages = await prisma.chatMessage.count({
    where: { createdAt: { lt: retentionCutoff } },
  });
  add({
    id: "chat-retention",
    label: "超過保留期的對話紀錄",
    value: `${staleMessages} 則（保留期 ${CHAT_RETENTION_DAYS} 天）`,
    // 隱私權政策寫了保留兩年。清理排程沒跑＝對外承諾沒兌現
    level: staleMessages > 0 ? 1 : 0,
    action:
      staleMessages > 0
        ? "清理排程沒跑到。手動跑一次：deploy/run-cron.sh retention"
        : "沒有逾期資料",
  });

  // ── 訂閱與金流 ─────────────────────────────────────────
  const pendingSubs = await prisma.subscription.findMany({
    where: { status: "pending", launchedAt: { not: null } },
    include: { order: { include: { payments: true } } },
  });
  const unauthorized = pendingSubs.filter((s) => {
    const onetime = s.order.payments.filter((p) => p.kind === "onetime");
    return onetime.length === 0 || onetime.every((p) => p.status === "paid");
  });
  const oldestUnauthDays = unauthorized.length
    ? Math.max(
        ...unauthorized.map((s) => days(now.getTime() - (s.launchedAt?.getTime() ?? now.getTime()))),
      )
    : 0;
  add({
    id: "sub-unauthorized",
    label: "已上線但維護未授權",
    value: unauthorized.length
      ? `${unauthorized.length} 筆（最久 ${oldestUnauthDays} 天）`
      : "0 筆",
    // 服務在跑、月費沒進來。排程最多自動追兩封，之後就只能靠人
    level: unauthorized.length === 0 ? 0 : oldestUnauthDays >= 14 ? 2 : 1,
    action: unauthorized.length
      ? "自動信最多寄兩封，超過就要直接打給客戶。清單在 /admin"
      : "都授權了",
  });

  const pastDue = await prisma.subscription.findMany({
    where: { pastDueSince: { not: null }, status: { notIn: ["cancelled", "replaced"] } },
    select: { orderId: true, dunningStage: true, pastDueSince: true },
  });
  add({
    id: "sub-pastdue",
    label: "扣款失敗欠費中",
    value: pastDue.length
      ? pastDue
          .map(
            (s) =>
              `${s.orderId}（第 ${s.dunningStage} 階段、${days(now.getTime() - (s.pastDueSince?.getTime() ?? now.getTime()))} 天）`,
          )
          .join("、")
      : "0 筆",
    level: pastDue.length > 0 ? 2 : 0,
    action: pastDue.length
      ? "催收階梯會自動往下走到暫停與終止，但在那之前先打一通電話通常就解決了"
      : "沒有欠費",
  });

  const commitSoon = await prisma.subscription.findMany({
    where: {
      status: "active",
      commitEndsAt: { not: null, lte: new Date(now.getTime() + COMMIT_NOTICE_DAYS * DAY) },
    },
    select: { orderId: true, commitEndsAt: true },
  });
  add({
    id: "commit-ending",
    label: `${COMMIT_NOTICE_DAYS} 天內承諾期屆滿`,
    value: commitSoon.length
      ? commitSoon
          .map((s) => `${s.orderId}（剩 ${days((s.commitEndsAt?.getTime() ?? 0) - now.getTime())} 天）`)
          .join("、")
      : "0 筆",
    // 屆滿當天客戶就能無條件停掉。要續約就得在那之前先談
    level: commitSoon.length > 0 ? 1 : 0,
    action: commitSoon.length ? "承諾期滿客戶即可隨時終止，先聯絡談續約或升級" : "近期沒有屆滿的",
  });

  const stuckOrders = await prisma.order.count({
    where: { status: "pending", createdAt: { lt: new Date(now.getTime() - ORDER_STUCK_DAYS * DAY) } },
  });
  add({
    id: "order-stuck",
    label: `停在未付款超過 ${ORDER_STUCK_DAYS} 天的訂單`,
    value: `${stuckOrders} 筆`,
    level: stuckOrders > 0 ? 1 : 0,
    action: stuckOrders
      ? "多半是結帳到一半離開。值得看一眼是不是金流某一步卡住了"
      : "沒有卡住的訂單",
  });

  // 爭議時要拿得出來的三件事：版本、雜湊、時間。缺了就等於沒有契約留證
  const noConsent = await prisma.order.count({ where: { agreedTermsVersion: null } });
  add({
    id: "order-consent",
    label: "沒有條款同意紀錄的訂單",
    value: `${noConsent} 筆`,
    level: noConsent > 0 ? 1 : 0,
    action: noConsent
      ? "舊訂單可忽略；若是最近成立的，表示結帳流程少寫了留證，要查 lib/legal-consent.ts"
      : "每一筆都有留證",
  });

  // 結帳刷卡失敗、事後也沒有再付成功的客人。他們是真的想買，
  // 只是卡片被拒或 3D 驗證沒過——主動聯絡通常救得回來，放著就流失了。
  const failedPays = await prisma.payment.findMany({
    where: { status: "failed", updatedAt: { gte: new Date(now.getTime() - PAYMENT_FAILED_DAYS * DAY) } },
    select: { orderId: true, order: { select: { name: true, status: true } } },
  });
  const lost = [
    ...new Map(
      failedPays
        .filter((p) => !["paid", "partial", "cancelled"].includes(p.order.status))
        .map((p) => [p.orderId, p.order.name] as const),
    ),
  ];
  add({
    id: "payment-failed",
    label: `${PAYMENT_FAILED_DAYS} 天內付款失敗、還沒付成功的客人`,
    value: lost.length ? `${lost.length} 位：` + lost.map(([id, name]) => `${name}（${id}）`).join("、") : "0 位",
    level: lost.length > 0 ? 1 : 0,
    action: lost.length
      ? "客人想買但刷卡沒過。到 /admin 看訂單，主動打電話或寄重新付款連結"
      : "沒有卡在付款這一步的客人",
  });

  // 電子發票是法定義務：收了錢沒開票，罰的是我們不是綠界。
  // 自動重試六次後會轉 manual 並寄一封信，但那封信很容易被埋掉，所以每天再提一次。
  const env = invoiceEnvironment();
  const [manualInvoices, slowInvoices] = await Promise.all([
    prisma.invoice.findMany({ where: { environment: env, status: "manual" }, select: { orderId: true, amount: true } }),
    prisma.invoice.count({
      where: { environment: env, status: "pending", createdAt: { lt: new Date(now.getTime() - DAY) } },
    }),
  ]);
  add({
    id: "invoice-stuck",
    label: "還沒開出去的電子發票",
    value:
      manualInvoices.length || slowInvoices
        ? [
            manualInvoices.length
              ? `需人工 ${manualInvoices.length} 張：` +
                manualInvoices.map((i) => `${i.orderId} NT$${i.amount.toLocaleString("en-US")}`).join("、")
              : "",
            slowInvoices ? `重試超過一天 ${slowInvoices} 張` : "",
          ]
            .filter(Boolean)
            .join("；")
        : "0 張",
    level: manualInvoices.length ? 2 : slowInvoices ? 1 : 0,
    action: manualInvoices.length
      ? "先到綠界後台查這筆是否已開立，沒有就手動開。收款後拖太久開票會被罰"
      : slowInvoices
        ? "自動重試中但已超過一天，確認綠界發票 API 金鑰與服務狀態"
        : "都開出去了",
  });

  // 即時通知信沒寄出去＝那一筆詢問／訂單沒有人知道。
  // 客戶站的訂單通知是寄給店家的，寄不出去時店家完全不知道有客人下單。
  const notifySince = new Date(now.getTime() - NOTIFY_LOOKBACK_DAYS * DAY);
  const [silentInquiries, silentShop] = await Promise.all([
    prisma.inquiry.findMany({ where: { notified: false, createdAt: { gte: notifySince } }, select: { tenantId: true } }),
    prisma.shopOrder.findMany({ where: { notified: false, createdAt: { gte: notifySince } }, select: { tenantId: true } }),
  ]);
  const silentBySite = new Map<string, number>();
  for (const r of [...silentInquiries, ...silentShop]) {
    const name = siteName(r.tenantId);
    silentBySite.set(name, (silentBySite.get(name) ?? 0) + 1);
  }
  const silentTotal = silentInquiries.length + silentShop.length;
  add({
    id: "notify-failed",
    label: `${NOTIFY_LOOKBACK_DAYS} 天內通知信沒寄出的詢問／訂單`,
    value: silentTotal ? `${silentTotal} 筆：` + [...silentBySite].map(([k, v]) => `${k} ${v}`).join("、") : "0 筆",
    level: silentTotal > 0 ? 2 : 0,
    action: silentTotal
      ? "這幾筆沒有人收到通知。先到 /admin 或客戶的 /portal 看內容並轉告；再查寄信設定（SMTP、寄件網域）是不是壞了"
      : "每一筆都有寄出通知",
  });

  // 客戶站的訂單是店家要處理的，但店家沒處理時客人會覺得「這網站是不是壞了」，
  // 最後怪到網站頭上。放太久就提醒店家一聲。
  const shopStale = await prisma.shopOrder.findMany({
    where: { status: "pending", createdAt: { lt: new Date(now.getTime() - SHOP_PENDING_DAYS * DAY) } },
    select: { tenantId: true },
  });
  const shopBySite = new Map<string, number>();
  for (const r of shopStale) {
    const name = siteName(r.tenantId);
    shopBySite.set(name, (shopBySite.get(name) ?? 0) + 1);
  }
  add({
    id: "shop-pending",
    label: `客戶站訂單超過 ${SHOP_PENDING_DAYS} 天沒確認`,
    value: shopStale.length ? `${shopStale.length} 筆：` + [...shopBySite].map(([k, v]) => `${k} ${v}`).join("、") : "0 筆",
    level: shopStale.length > 0 ? 1 : 0,
    action: shopStale.length
      ? "客人下了單還沒被確認。傳個訊息提醒店家到 /portal/orders 確認收款或出貨"
      : "店家都有在處理",
  });

  // 廣告轉換回報一直失敗的話，廣告平台以為沒有成交，出價會越來越不準。
  await guard("ads-conversion", "廣告轉換回報重試 3 次以上", async () => {
    const adsStuck = await prisma.adsConversion.count({
      where: { sentAt: null, attempts: { gte: 3 }, payload: { not: "" } },
    });
    add({
      id: "ads-conversion",
      label: "廣告轉換回報重試 3 次以上",
      value: `${adsStuck} 筆`,
      level: adsStuck > 0 ? 1 : 0,
      action: adsStuck
        ? "廣告平台收不到成交。確認 .env 的廣告金鑰與 Pixel ID，錯誤原因在資料庫 AdsConversion.lastError"
        : "回報正常",
    });
  });

  // ── 行銷檔期 ───────────────────────────────────────────
  const left = seatsLeft();
  const expired = isExpired(now.getTime());
  const daysLeft = days(currentDeadline(now.getTime()) - now.getTime());
  add({
    id: "promo-window",
    label: "限時檔期",
    value: expired
      ? `已於 ${new Date(PROMO_WINDOW.endsAt ?? 0).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })} 結束`
      : `剩 ${daysLeft} 天、${left}/${PROMO_WINDOW.seatsTotal} 席`,
    // 檔期一過，首頁與 /launch 就不再顯示優惠，但短影音、貼文、名片上的
    // 宣傳還在外面跑——客人點進來看到的是另一回事
    level: expired || left === 0 ? 2 : daysLeft <= PROMO_NOTICE_DAYS ? 1 : 0,
    action:
      expired || left === 0
        ? "站上已不再顯示這一檔。要續檔就改 src/lib/promo-window.ts 的 endsAt／seatsTaken 再部署，否則外面的宣傳素材會跟網站對不上"
        : daysLeft <= PROMO_NOTICE_DAYS
          ? "快到期了，先決定續檔還是收檔"
          : "檔期進行中",
  });

  return checks;
}

/**
 * 轉成每日簡報吃的 TSV。
 *
 * 用 TSV 而不是 JSON 的理由同 daily-report.sh：那支是 bash，一行一筆、tab 分欄
 * 才不會被引號炸掉。欄位裡的 tab 與換行先清掉，否則會錯位。
 */
export function auditTsv(checks: OpsCheck[]): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();
  return checks
    .map((c) => ["audit", c.level, c.id, clean(c.label), clean(c.value), clean(c.action)].join("\t"))
    .join("\n");
}

// ── 昨天的生意 ────────────────────────────────────────────
//
// 簡報最上面那一塊。原本是 daily-report.sh 自己用 sqlite3 數 Inquiry／Order／Payment，
// 只看得到 Avalo 主站：REKAT 的 ShopOrder、Amber 的 DgOrder 根本不在裡面，
// 客戶站的詢問單也跟主站混在同一個數字裡。租戶名稱與金額欄位住在程式碼裡，
// 所以改由這裡算，bash 那份只留作稽核失敗時的備援。

export type BizKind = "inquiry" | "order" | "paid" | "failed" | "shop" | "daigou";

export interface BizLine {
  site: string;
  kind: BizKind;
  count: number;
  /** 新台幣。詢問單沒有金額，填 0 */
  amount: number;
  /** 前幾筆的「誰、多少」，讓人不用登入後台就知道是什麼生意 */
  detail: string[];
}

const DETAIL_MAX = 5;
const ntd = (v: number) => `NT$${v.toLocaleString("en-US")}`;

/** 與每日簡報同一個統計區間：前一個 UTC 整日 */
export function yesterdayUtc(now: Date = new Date()) {
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return { from: new Date(to.getTime() - DAY), to };
}

export async function runBusinessDigest(now: Date = new Date()): Promise<BizLine[]> {
  const { from, to } = yesterdayUtc(now);
  const inWindow = { gte: from, lt: to };
  const out: BizLine[] = [];
  const push = (site: string, kind: BizKind, rows: { amount: number; detail: string }[]) => {
    if (!rows.length) return;
    out.push({
      site,
      kind,
      count: rows.length,
      amount: rows.reduce((m, r) => m + r.amount, 0),
      detail: rows.slice(0, DETAIL_MAX).map((r) => r.detail),
    });
  };

  const [inquiries, orders, paid, failed, shop, daigou] = await Promise.all([
    prisma.inquiry.findMany({
      where: { createdAt: inWindow },
      orderBy: { createdAt: "asc" },
      select: { tenantId: true, name: true, service: true },
    }),
    prisma.order.findMany({
      where: { createdAt: inWindow },
      orderBy: { createdAt: "asc" },
      select: { name: true, oneTimeTotal: true, monthlyTotal: true },
    }),
    prisma.payment.findMany({
      where: { status: "paid", paidAt: inWindow },
      orderBy: { paidAt: "asc" },
      select: { amount: true, kind: true, order: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: { status: "failed", updatedAt: inWindow },
      orderBy: { updatedAt: "asc" },
      select: { amount: true, order: { select: { name: true } } },
    }),
    prisma.shopOrder.findMany({
      where: { createdAt: inWindow, status: { not: "cancelled" } },
      orderBy: { createdAt: "asc" },
      select: { tenantId: true, name: true, total: true, payment: true },
    }),
    prisma.dgOrder.findMany({
      where: { createdAt: inWindow, status: { not: "void" } },
      orderBy: { createdAt: "asc" },
      select: {
        tenantId: true,
        itemsTotal: true,
        source: true,
        member: { select: { name: true, lineDisplayName: true } },
      },
    }),
  ]);

  const bySite = <T extends { tenantId: string | null }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = siteName(r.tenantId);
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  };
  const inquiryRow = (q: { name: string; service: string | null }) => ({
    amount: 0,
    detail: q.service ? `${q.name}（${q.service}）` : q.name,
  });

  // 主站排第一：那是我們自己的營收
  const house = siteName(null);
  const inqSites = bySite(inquiries);
  push(house, "inquiry", (inqSites.get(house) ?? []).map(inquiryRow));
  push(
    house,
    "order",
    orders.map((o) => ({
      amount: o.oneTimeTotal,
      detail: [o.name, o.oneTimeTotal ? ntd(o.oneTimeTotal) : "", o.monthlyTotal ? `月費 ${ntd(o.monthlyTotal)}` : ""]
        .filter(Boolean)
        .join(" "),
    })),
  );
  push(
    house,
    "paid",
    paid.map((p) => ({
      amount: p.amount,
      detail: `${p.order.name} ${ntd(p.amount)}${p.kind === "period" ? "（月費授權）" : ""}`,
    })),
  );
  push(house, "failed", failed.map((p) => ({ amount: p.amount, detail: `${p.order.name} ${ntd(p.amount)}` })));

  for (const [site, rows] of inqSites) if (site !== house) push(site, "inquiry", rows.map(inquiryRow));
  for (const [site, rows] of bySite(shop)) {
    push(
      site,
      "shop",
      rows.map((o) => ({
        amount: o.total,
        detail: `${o.name} ${ntd(o.total)}（${o.payment === "cod" ? "貨到付款" : o.payment === "transfer" ? "匯款" : o.payment}）`,
      })),
    );
  }
  for (const [site, rows] of bySite(daigou)) {
    push(
      site,
      "daigou",
      rows.map((o) => ({
        amount: o.itemsTotal,
        detail:
          `${o.member.name || o.member.lineDisplayName || "會員"} ${ntd(o.itemsTotal)}` +
          (o.source === "manual" ? "（後台代打）" : ""),
      })),
    );
  }
  return out;
}

/** 生意的 TSV：biz、站名、種類、筆數、金額、明細（明細之間用「、」） */
export function bizTsv(lines: BizLine[]): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();
  return lines
    .map((b) => ["biz", clean(b.site), b.kind, b.count, b.amount, clean(b.detail.join("、"))].join("\t"))
    .join("\n");
}
