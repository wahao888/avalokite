import { randomBytes } from "node:crypto";
import type { Order, Prisma } from "@prisma/client";
import { ADDONS, getProduct } from "@/lib/products";

type DB = Prisma.TransactionClient;
export const referralEmail = (email: string) => email.trim().toLowerCase();
export function referralPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("886") ? `0${digits.slice(3)}` : digits;
}
export const validReferralCode = (code: string) => /^AV-[A-F0-9]{12}$/.test(code);

// 以實際有扣款、沒有欠費的有效維護訂閱為準。換卡／換方案不影響邀請碼。
export async function activeCare(db: DB, email: string) {
  const subscriptions = await db.subscription.findMany({
    where: { status: "active", totalSuccessTimes: { gt: 0 }, pastDueSince: null },
    include: { order: true },
  });
  return subscriptions.filter((s) => referralEmail(s.order.email) === referralEmail(email));
}

export async function issueReferralCode(db: DB, email: string) {
  const normalized = referralEmail(email);
  if (!(await activeCare(db, normalized)).length) throw new Error("inactive care");
  return db.referralCode.upsert({
    where: { email: normalized }, update: {},
    create: { email: normalized, code: `AV-${randomBytes(6).toString("hex").toUpperCase()}` },
  });
}

export async function referralEligibility(
  db: DB, code: string, buyer: { email: string; phone: string }, excludeOrderId?: string,
) {
  if (!validReferralCode(code)) return false;
  const invitation = await db.referralCode.findUnique({ where: { code } });
  if (!invitation) return false;
  const email = referralEmail(buyer.email);
  const phone = referralPhone(buyer.phone);
  if (phone.length < 7 || invitation.email === email) return false;
  const ownerCare = await activeCare(db, invitation.email);
  if (!ownerCare.length || ownerCare.some((s) => referralPhone(s.order.phone) === phone)) return false;
  if (await db.referral.findFirst({ where: { OR: [{ email }, { phone }] } })) return false;
  // 舊資料的 Email 大小寫、手機格式可能不一致，統一正規化後比較。
  const paid = await db.order.findMany({
    where: { ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}), OR: [
      { payments: { some: { status: "paid" } } }, { subscriptions: { some: { totalSuccessTimes: { gt: 0 } } } },
    ] },
    select: { email: true, phone: true },
  });
  return !paid.some((o) => referralEmail(o.email) === email || referralPhone(o.phone) === phone);
}

// 必須在已驗章、金額吻合且非模擬付款的交易內呼叫；付款與兩個月獎勵一起提交。
export async function grantReferral(db: DB, order: Order) {
  const code = order.referralCode;
  if (!code || !(await referralEligibility(db, code, order, order.id))) return null;
  const invitation = await db.referralCode.findUniqueOrThrow({ where: { code } });
  return db.referral.create({
    data: {
      orderId: order.id, code, email: referralEmail(order.email), phone: referralPhone(order.phone),
      rewards: { create: [
        { side: "referrer", email: invitation.email },
        { side: "friend", email: referralEmail(order.email) },
      ] },
    },
    include: { rewards: true },
  });
}

// ── 獎勵：免費服務一次（三選一）──────────────────────────────
// 價值直接引用定價頁的數字，改價時這裡跟著變，不會出現兩個版本。
// 「新增一頁」沒有公開單價（依頁面內容而定），所以不標金額。
const rescue = getProduct("site-rescue");
const seo = ADDONS.find((a) => a.id === "seo-starter");

export const REFERRAL_SERVICES = [
  {
    key: "site-check",
    value: rescue?.price ?? null,
    zh: { name: "網站健檢報告", desc: "速度、SEO、資安與 AI 搜尋能見度檢測，附書面改善建議" },
    en: { name: "Website health check", desc: "Speed, SEO, security and AI-search visibility review with a written action plan" },
  },
  {
    key: "seo-starter",
    value: seo?.price ?? null,
    zh: { name: "SEO 起步包", desc: seo?.i18n["zh-TW"].desc ?? "關鍵字規劃、頁面 meta 與結構優化" },
    en: { name: "SEO starter", desc: seo?.i18n.en.desc ?? "Keyword plan and on-page optimisation" },
  },
  {
    key: "extra-page",
    value: null,
    zh: { name: "新增一頁", desc: "套用網站現有版型，例如活動頁或新服務頁，文字與圖片需先備妥" },
    en: { name: "One extra page", desc: "Built on your site's existing layout, such as a campaign or new service page; you supply copy and images" },
  },
] as const;
export type ReferralServiceKey = (typeof REFERRAL_SERVICES)[number]["key"];
export const referralService = (key: string | null | undefined) => REFERRAL_SERVICES.find((s) => s.key === key) ?? null;

/** 核發起算的有效月數 */
export const REWARD_VALID_MONTHS = 12;

// 依台北日曆加月並月底夾限：1/31 + 1 個月 = 2/28（閏年為 2/29）。
export function addTaipeiMonths(date: Date, months: number) {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offset);
  const end = new Date(local);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(local.getUTCDate(), last));
  return new Date(end.getTime() - offset);
}
export const rewardExpiresAt = (createdAt: Date) => addTaipeiMonths(createdAt, REWARD_VALID_MONTHS);
export const rewardUsable = (r: { redeemedAt: Date | null; createdAt: Date }, now = new Date()) =>
  !r.redeemedAt && now < rewardExpiresAt(r.createdAt);

export async function referralSummary(db: DB, email: string, now = new Date()) {
  const normalized = referralEmail(email);
  const [invitation, rewards] = await Promise.all([
    db.referralCode.findUnique({ where: { email: normalized } }),
    db.careReward.findMany({ where: { email: normalized }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    code: invitation?.code ?? null,
    available: rewards.filter((r) => rewardUsable(r, now)).length,
    rewards: rewards.map((r) => ({ ...r, expiresAt: rewardExpiresAt(r.createdAt) })),
  };
}

// 服務交付之後才登記：選了哪一項、交付紀錄。登記不會碰訂閱、月費或綠界。
export async function fulfillReward(db: DB, input: { id: number; service: string; note: string }, now = new Date()) {
  const service = referralService(input.service);
  const note = input.note.trim();
  if (!service || note.length < 2) throw new Error("invalid fulfilment");
  const reward = await db.careReward.findUnique({ where: { id: input.id } });
  if (!reward || !rewardUsable(reward, now)) throw new Error("reward unavailable");
  const result = await db.careReward.updateMany({
    where: { id: reward.id, redeemedAt: null },
    data: { redeemedAt: now, service: service.key, note },
  });
  if (!result.count) throw new Error("reward unavailable");
  return { email: reward.email, service };
}
