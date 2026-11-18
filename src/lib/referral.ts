import { randomBytes } from "node:crypto";
import type { Order, Prisma } from "@prisma/client";

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

export async function referralSummary(db: DB, email: string) {
  const normalized = referralEmail(email);
  const [invitation, rewards] = await Promise.all([
    db.referralCode.findUnique({ where: { email: normalized } }),
    db.careReward.findMany({ where: { email: normalized }, orderBy: { createdAt: "desc" } }),
  ]);
  return { code: invitation?.code ?? null, available: rewards.filter((r) => !r.redeemedAt).length, rewards };
}

// 依台北日曆月底夾限：1/31 + 一個月 = 2/28（閏年為 2/29）。
export function nextCareMonth(date: Date) {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(date.getTime() + offset);
  const end = new Date(local);
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(local.getUTCDate(), last));
  return new Date(end.getTime() - offset);
}

// 不冒充已免扣款：須先在綠界調整排程，再帶核對紀錄登記一個確定免費的服務月。
export async function redeemCareReward(db: DB, input: {
  id: number; mtn: string; freeFrom: Date; billingReference: string;
}) {
  if (!Number.isFinite(input.freeFrom.getTime()) || input.billingReference.trim().length < 5) {
    throw new Error("invalid redemption");
  }
  const reward = await db.careReward.findUnique({ where: { id: input.id } });
  if (!reward || reward.redeemedAt) throw new Error("reward unavailable");
  const sub = await db.subscription.findUnique({ where: { merchantTradeNo: input.mtn }, include: { order: true } });
  if (!sub || sub.status !== "active" || sub.pastDueSince || referralEmail(sub.order.email) !== reward.email) {
    throw new Error("invalid subscription");
  }
  const freeUntil = nextCareMonth(input.freeFrom);
  const overlap = await db.careReward.findFirst({ where: {
    merchantTradeNo: input.mtn, redeemedAt: { not: null },
    freeFrom: { lt: freeUntil }, freeUntil: { gt: input.freeFrom },
  } });
  if (overlap) throw new Error("overlapping free month");
  const result = await db.careReward.updateMany({
    where: { id: reward.id, redeemedAt: null },
    data: { redeemedAt: new Date(), merchantTradeNo: input.mtn, freeFrom: input.freeFrom,
      freeUntil, billingReference: input.billingReference.trim() },
  });
  if (!result.count) throw new Error("reward unavailable");
  return { email: reward.email, freeUntil };
}
