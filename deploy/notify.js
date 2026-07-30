#!/usr/bin/env node
// 伺服器端寄信小工具（給 cron 用的健康檢查／每日簡報）。
// 伺服器上沒有 MTA，這支直接沿用專案 .env 裡那組 SMTP 設定與 node_modules 的 nodemailer。
//
//   node deploy/notify.js "主旨" "內文"
//   echo "內文" | node deploy/notify.js "主旨"
//
// 注意：這條路徑不經過 src/lib/mail.ts 的每小時 30 封上限，
// 所以每支呼叫端都必須自己做冷卻（見 health-check.sh 的 COOLDOWN）。
const fs = require("fs");
const path = require("path");

const APP = path.resolve(__dirname, "..");

// 手動讀 .env：cron 不會帶 systemd 的 EnvironmentFile
function loadEnv() {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(path.join(APP, ".env"), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const subject = process.argv[2];
  const body = process.argv[3] ?? fs.readFileSync(0, "utf8");

  if (!subject) {
    console.error("用法: node deploy/notify.js \"主旨\" [\"內文\"]");
    process.exit(2);
  }
  if (!env.SMTP_HOST || !env.MAIL_OWNER) {
    console.error("[notify] .env 缺 SMTP_HOST 或 MAIL_OWNER，不寄信");
    process.exit(1);
  }

  const nodemailer = require(path.join(APP, "node_modules", "nodemailer"));
  const t = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    secure: Number(env.SMTP_PORT) === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await t.sendMail({ from: env.MAIL_FROM, to: env.MAIL_OWNER, subject, text: body });
  console.log(`[notify] sent: ${subject}`);
}

main().catch((err) => {
  console.error("[notify] failed:", err.message);
  process.exit(1);
});
