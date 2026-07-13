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

export async function notifyOwner(subject: string, text: string) {
  const owner = process.env.MAIL_OWNER;
  if (!owner) {
    console.log(`[owner mail skipped] ${subject}`);
    return;
  }
  await sendMail({ to: owner, subject, text });
}
