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

// 使用者輸入會進到主旨與 Reply-To，必須清掉換行——否則可以注入額外的信件標頭
// （經典的 header injection，能偷加 Bcc 把信轉走）。
const hdr = (s: string) => s.replace(/[\r\n]+/g, " ").trim().slice(0, 200);

// 回傳是否真的寄出（SMTP 未設定或寄信失敗皆為 false）。
// 金流流程不看回傳值（不擋單）；排程寄授權連結則據此決定是否標記已寄，避免漏寄。
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  bcc?: string;
  replyTo?: string;
  /** 寄件者顯示名稱。信封網域一律沿用 MAIL_FROM，只換顯示名（見 notifyTenant 的說明） */
  fromName?: string;
}): Promise<boolean> {
  const t = transporter();
  if (!t) {
    console.log(`[mail skipped] to=${opts.to} subject=${opts.subject}`);
    return false;
  }
  const { fromName, ...rest } = opts;
  // MAIL_FROM 可能是 "Avalo <no-reply@x>" 或裸信箱，兩種都要能換掉顯示名
  const envelope = (process.env.MAIL_FROM ?? "").match(/<([^>]+)>/)?.[1]
    ?? process.env.MAIL_FROM ?? "";
  const from = fromName ? `${hdr(fromName)} <${envelope}>` : process.env.MAIL_FROM;
  try {
    await t.sendMail({ ...rest, from, subject: hdr(rest.subject) });
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

// 閘門以 key 分艙：主站用 "owner"，每個客戶站用自己的 slug。
// 這樣某一家客戶的表單被機器人灌爆時，不會連帶讓其他客戶收不到通知。
const mailTimes = new Map<string, number[]>();

/** @returns "ok" 可寄 | "threshold" 剛跨過門檻（寄一封告警） | "over" 靜默丟棄 */
function gate(key: string): "ok" | "threshold" | "over" {
  const now = Date.now();
  const arr = (mailTimes.get(key) ?? []).filter((t) => now - t < HOUR_MS);
  mailTimes.set(key, arr);
  if (arr.length < MAX_PER_HOUR) {
    arr.push(now);
    return "ok";
  }
  if (arr.length === MAX_PER_HOUR) {
    arr.push(now); // 佔掉名額，讓告警信只寄一次
    return "threshold";
  }
  return "over";
}

const throttleNotice = (subject: string, who: string) =>
  `一小時內已寄出 ${MAX_PER_HOUR} 封${who}通知信，為避免信箱被灌爆已暫停寄送，滿一小時後自動恢復。\n\n這通常代表有機器人在灌表單。請檢查 nginx access log 找出來源 IP：\n  sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head\n\n期間的資料仍會正常寫入資料庫，不會遺失。\n\n被擋下的第一封：${subject}`;

/** @returns 是否真的寄出，供呼叫端寫入 Inquiry.notified */
export async function notifyOwner(subject: string, text: string): Promise<boolean> {
  const owner = process.env.MAIL_OWNER;
  if (!owner) {
    console.log(`[owner mail skipped] ${subject}`);
    return false;
  }

  const g = gate("owner");
  if (g === "threshold") {
    await sendMail({
      to: owner,
      subject: `[Avalo] ⚠️ 通知信已達每小時上限（${MAX_PER_HOUR} 封），暫停寄送`,
      text: `${throttleNotice(subject, "站方")}\n\n可到 /admin 查看期間的資料。`,
    });
    console.warn(`[owner mail throttled] ${subject}`);
    return false;
  }
  if (g === "over") {
    console.warn(`[owner mail dropped] ${subject}`);
    return false;
  }

  return sendMail({ to: owner, subject, text });
}

/**
 * 客戶站表單通知：寄給該租戶自己的收件人，Avalo 永遠密件備份一份。
 *
 * 寄件者網域的關鍵原則：**From 一律用我們自己、有 SPF/DKIM 的網域**，
 * 絕不把提交者的 email 當 From——那會直接造成收件方 DMARC 對齊失敗，
 * 是把自己送進垃圾信匣最快的方法。改為顯示名做租戶品牌化 + Reply-To 指向提交者，
 * 客戶按「回覆」一樣直接回給詢問的人。
 *
 * @returns 是否真的寄出，供呼叫端寫入 Inquiry.notified
 */
export async function notifyTenant(
  tenant: { slug: string; name: string; notifyEnv: string },
  opts: { subject: string; text: string; replyTo?: string },
): Promise<boolean> {
  const to = (process.env[tenant.notifyEnv] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const owner = process.env.MAIL_OWNER;

  if (to.length === 0) {
    // 沒設收件人不能讓客戶的單靜靜消失，退回寄給 Avalo 自己
    console.warn(`[notifyTenant] ${tenant.slug} 未設定 ${tenant.notifyEnv}，改寄 MAIL_OWNER`);
    if (!owner) return false;
    return sendMail({ to: owner, ...opts, fromName: `${tenant.name} 官網表單` });
  }

  const g = gate(`tenant:${tenant.slug}`);
  if (g === "threshold") {
    await sendMail({
      to: to.join(", "),
      bcc: owner,
      subject: `[${tenant.name}] ⚠️ 通知信已達每小時上限，暫停寄送`,
      text: `${throttleNotice(opts.subject, "表單")}\n\n期間的資料仍可在客戶後台查看。`,
      fromName: `${tenant.name} 官網表單`,
    });
    console.warn(`[tenant mail throttled] ${tenant.slug} ${opts.subject}`);
    return false;
  }
  if (g === "over") {
    console.warn(`[tenant mail dropped] ${tenant.slug} ${opts.subject}`);
    return false;
  }

  return sendMail({
    to: to.join(", "),
    bcc: owner, // 客戶說「沒收到」時可以查證
    subject: opts.subject,
    text: opts.text,
    replyTo: opts.replyTo ? hdr(opts.replyTo) : undefined,
    fromName: `${tenant.name} 官網表單`,
  });
}
