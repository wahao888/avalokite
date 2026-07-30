import nodemailer from "nodemailer";

// SMTP 未設定時僅 console.log，不擋下單流程
function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

// 回傳是否真的寄出（SMTP 未設定或寄信失敗皆為 false）。
// 金流流程不看回傳值（不擋單）；排程寄授權連結則據此決定是否標記已寄，避免漏寄。
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const t = transporter();
  if (!t) {
    console.log(`[mail skipped] to=${opts.to} subject=${opts.subject}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, ...opts });
    return true;
  } catch (err) {
    // 寄信失敗不可影響金流回應
    console.error("[mail error]", err);
    return false;
  }
}

// 通知信流量閘：每小時最多寄 MAX_PER_HOUR 封給站方。
// 超過就停寄，只在「剛超過」時補一封告知信，避免被灌爆信箱。
// （2026-07-30 曾有掃描器灌 /api/contact 205 次，直接產生 205 封通知信。）
const MAX_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;
let ownerMailTimes: number[] = [];

export async function notifyOwner(subject: string, text: string) {
  const owner = process.env.MAIL_OWNER;
  if (!owner) {
    console.log(`[owner mail skipped] ${subject}`);
    return;
  }

  const now = Date.now();
  ownerMailTimes = ownerMailTimes.filter((t) => now - t < HOUR_MS);
  if (ownerMailTimes.length >= MAX_PER_HOUR) {
    // 只有「正好跨過門檻」那一次寄出告警，之後靜默丟棄
    if (ownerMailTimes.length === MAX_PER_HOUR) {
      ownerMailTimes.push(now);
      await sendMail({
        to: owner,
        subject: `[Avalo] ⚠️ 通知信已達每小時上限（${MAX_PER_HOUR} 封），暫停寄送`,
        text: `一小時內已寄出 ${MAX_PER_HOUR} 封站方通知信，為避免信箱被灌爆已暫停寄送，滿一小時後自動恢復。\n\n這通常代表有機器人在灌表單。請檢查 nginx access log 找出來源 IP：\n  sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head\n\n期間的資料仍會正常寫入資料庫，可到 /admin 查看，不會遺失。\n\n被擋下的第一封：${subject}`,
      });
      console.warn(`[owner mail throttled] ${subject}`);
      return;
    }
    console.warn(`[owner mail dropped] ${subject}`);
    return;
  }

  ownerMailTimes.push(now);
  await sendMail({ to: owner, subject, text });
}
