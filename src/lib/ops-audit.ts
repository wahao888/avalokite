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
import { getTenant } from "@/lib/tenants";

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

export async function runOpsAudit(now: Date = new Date()): Promise<OpsCheck[]> {
  const checks: OpsCheck[] = [];
  const add = (c: OpsCheck) => checks.push(c);

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
    const name = q.tenantId ? (getTenant(q.tenantId)?.name ?? q.tenantId) : "Avalo 主站";
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

  const spend = await monthlySpendUsd();
  const ratio = MONTHLY_BUDGET > 0 ? spend / MONTHLY_BUDGET : 0;
  add({
    id: "ai-budget",
    label: "AI 客服本月花費",
    value: `US$${spend.toFixed(4)} / 上限 US$${MONTHLY_BUDGET}（${Math.round(ratio * 100)}%）`,
    level: ratio >= 1 ? 2 : ratio >= 0.7 ? 1 : 0,
    action:
      ratio >= 1
        ? "已達上限，AI 客服這個月剩下的對話一律改成請客人留聯絡方式；要放寬改 .env 的 AI_MONTHLY_BUDGET_USD"
        : ratio >= 0.7
          ? "用量偏高，先確認是真客人還是有人在灌"
          : "在預算內",
  });

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
