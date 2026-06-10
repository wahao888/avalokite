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

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  const t = transporter();
  if (!t) {
    console.log(`[mail skipped] to=${opts.to} subject=${opts.subject}`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, ...opts });
  } catch (err) {
    // 寄信失敗不可影響金流回應
    console.error("[mail error]", err);
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
