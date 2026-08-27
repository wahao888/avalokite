#!/usr/bin/env node
// 每日簡報的排版與判讀。daily-report.sh 只負責「採集」，這支負責「解讀 + 排版 + 寄出」。
//
//   deploy/daily-report.sh  ──(TSV)──▶  report-render.js  ──▶  notify.js ──▶ 信箱
//   node deploy/report-render.js --stdout < sample.tsv > preview.html   # 本機預覽 HTML，不寄信
//   node deploy/report-render.js --text   < sample.tsv                   # 看純文字版與主旨
//
// 為什麼資料用 TSV 而不是 JSON：值裡面有攻擊者送來的路徑字串，在 bash 裡拼 JSON
// 遲早會被引號炸掉。nginx 會把 log 欄位裡的 " 與控制字元轉成 \x22，
// 所以「一行一筆、用 tab 分欄」是不會有歧義的最省事格式。
//
// 排版限制：這是「信」不是網頁——Gmail 會砍掉 <style>、不吃 flex/grid/JS/外部圖檔。
// 因此全部用 table 佈局 + inline style，色票取自站上的 globals.css，不引用任何外部資源。

const fs = require("fs");

// ── 色票（同 src/app/globals.css 的品牌色）────────────────────────────
const C = {
  paper: "#F0EBE3",
  card: "#FFFFFF",
  ink: "#2F2B26",
  muted: "#8C8478",
  border: "#D6CDBD",
  moss: "#5F7155",
  wood: "#A98467",
  okBg: "#E9EEE4",
  okLine: "#5F7155",
  warn: "#8A6520",
  warnBg: "#F7EFDD",
  warnLine: "#C39A4A",
  bad: "#8A3B2A",
  badBg: "#F6E5E0",
  badLine: "#C0876F",
};
// 字體名稱一律用單引號：整份樣式是塞進 style="..." 的，
// 字串裡若有雙引號會把屬性提早關掉，後面的 white-space、color 全部失效。
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif";

// ── 解析 stdin 的 TSV ────────────────────────────────────────────────
const LIST_KEYS = new Set(["top_ip", "top_bad", "top_path", "top_404", "leak_path", "jail"]);

function parse(raw) {
  const s = {};
  const l = {};
  for (const key of LIST_KEYS) l[key] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue; // # 開頭是註解（給 report-sample.tsv 用）
    const parts = line.split("\t");
    const key = parts.shift();
    if (LIST_KEYS.has(key)) l[key].push(parts);
    else s[key] = parts.join("\t");
  }
  return { s, l };
}

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (v) => n(v).toLocaleString("en-US");
const pct = (part, whole) => (n(whole) > 0 ? Math.round((n(part) / n(whole)) * 1000) / 10 : 0);
// 攻擊者可以隨意送長路徑，不截斷的話版面會被撐爆
const short = (v, max = 42) => (String(v).length > max ? String(v).slice(0, max) + "…" : String(v));

// ── 主流程 ───────────────────────────────────────────────────────────
const raw = fs.readFileSync(0, "utf8");
const { s, l } = parse(raw);

const total = n(s.total);
const blocked = n(s.s444) + n(s.s429);
const okReq = n(s.s2xx) + n(s.s3xx);

// ── 判讀：哪些是「今天真的要你動手」的事 ─────────────────────────────
// 這一段是整封信的重點。數字誰都看得到，難的是知道哪個數字要理會。
// level: 2 = 立刻處理、1 = 注意、0 = 只是說明
const findings = [];
const flag = (level, what, why) => findings.push({ level, what, why });

if (s.svc !== "active") flag(2, `網站服務不是 active（${s.svc || "讀取失敗"}）`, "上伺服器看 journalctl -u avalo -n 50");
if (n(s.leak) > 0)
  flag(2, `${fmt(s.leak)} 次掃描探測被送進網站程式`, "攔截樣式有缺口，把下面列的路徑補進 deploy/nginx-scan-block.conf");
if (n(s.probe_redirect) > 0)
  flag(1, `${fmt(s.probe_redirect)} 次探測只拿到 301 導轉`, "有 server 區塊少了 include avalo-scan-block.conf（:80 導轉站台最常漏）；沒被送進程式，但 fail2ban 抓不到這種紀錄");
if (n(s.authok) > 0) flag(1, `後台成功登入 ${fmt(s.authok)} 次`, "如果不是你本人登入的，立刻換掉 ADMIN_PASSWORD");
if (n(s.authfail) >= 10) flag(1, `後台登入失敗 ${fmt(s.authfail)} 次`, "有人在猜密碼，確認 avalo-auth jail 有在封鎖");
if (n(s.s5xx) >= 50) flag(2, `${fmt(s.s5xx)} 次 5xx（網站自己出錯）`, "這是程式錯誤不是攻擊，看 journalctl -u avalo");
else if (n(s.s5xx) > 0) flag(1, `${fmt(s.s5xx)} 次 5xx（網站自己出錯）`, "量不大，但值得看一眼是哪支 API");
if (n(s.disk_pct) >= 85) flag(2, `磁碟已用 ${s.disk_pct}%`, "清 /var/log 或舊備份，滿了會整站寫不進資料庫");
else if (n(s.disk_pct) >= 75) flag(1, `磁碟已用 ${s.disk_pct}%`, "還沒到警戒值 85%，但趨勢要留意");
if (s.cert_days === "" || s.cert_days == null) flag(1, "讀不到 HTTPS 憑證", "檢查 /etc/letsencrypt 是否還在");
else if (n(s.cert_days) <= 20) flag(2, `HTTPS 憑證剩 ${s.cert_days} 天`, "自動續期沒跑成功：sudo certbot renew --dry-run");
else if (n(s.cert_days) <= 30) flag(1, `HTTPS 憑證剩 ${s.cert_days} 天`, "續期理應在剩 30 天時啟動，再觀察一天");
if (!s.backup) flag(2, "找不到任何資料庫備份", "檢查 backup-db.sh 的 cron 有沒有在跑");
else if (n(s.backup_age_h) > 48) flag(2, `最近備份是 ${s.backup_age_h} 小時前`, "備份排程掛了，資料庫沒有退路");
else if (n(s.backup_age_h) > 30) flag(1, `最近備份是 ${s.backup_age_h} 小時前`, "比預期的 24 小時久，確認 cron");
if (s.db_inquiry === "ERR") flag(1, "讀不到資料庫筆數", "sqlite3 讀 prod.db 失敗，確認檔案權限");

// 「必做」排在「留意」前面：這份清單是給人照著做的，不是流水帳
findings.sort((a, b) => b.level - a.level);
const worst = findings.reduce((m, f) => Math.max(m, f.level), 0);
const V = [
  { emoji: "✅", word: "一切正常", line: "沒有需要你動手的事，這封信可以直接歸檔。", bg: C.okBg, line2: C.okLine, fg: C.moss },
  { emoji: "⚠️", word: "有事情要留意", line: "不緊急，但別放著不管。", bg: C.warnBg, line2: C.warnLine, fg: C.warn },
  { emoji: "🔴", word: "需要立刻處理", line: "下面第一項就是要先做的事。", bg: C.badBg, line2: C.badLine, fg: C.bad },
][worst];

// ── HTML 小元件 ──────────────────────────────────────────────────────
const T = (attrs, inner) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${attrs}>${inner}</table>`;

function section(title, hint, inner) {
  return `
  <tr><td style="padding:26px 24px 0 24px;">
    <div style="font:600 15px/1.4 ${FONT};color:${C.ink};letter-spacing:.02em;">${title}</div>
    ${hint ? `<div style="font:400 12px/1.6 ${FONT};color:${C.muted};padding-top:4px;">${hint}</div>` : ""}
  </td></tr>
  <tr><td style="padding:12px 24px 0 24px;">${inner}</td></tr>`;
}

// 四格數字卡。用 table 而不是 flex——Gmail 不吃 flex。
function cards(items) {
  const w = Math.floor(100 / items.length);
  const tds = items
    .map(
      (it) => `<td width="${w}%" valign="top" style="padding:0 4px;">
      ${T(`width="100%" style="background:${C.card};border:1px solid ${C.border};border-radius:8px;"`,
        `<tr><td style="padding:12px 10px;text-align:center;">
          <div style="font:700 22px/1.2 ${FONT};color:${it.color || C.ink};white-space:nowrap;">${it.value}</div>
          <div style="font:400 11px/1.5 ${FONT};color:${C.muted};padding-top:3px;">${it.label}</div>
        </td></tr>`)}
    </td>`
    )
    .join("");
  return T('width="100%"', `<tr>${tds}</tr>`);
}

// 橫條圖：用兩個有底色的 td 拼出來，不需要圖檔
function barRows(rows, max, color) {
  if (!rows.length) return `<div style="font:400 12px/1.6 ${FONT};color:${C.muted};">（無）</div>`;
  return T('width="100%" style="border-collapse:collapse;"',
    rows
      .map(([count, label]) => {
        const w = Math.max(2, Math.round((n(count) / Math.max(1, max)) * 100));
        return `<tr>
      <td width="58%" style="padding:3px 8px 3px 0;font:400 12px/1.5 ${FONT};color:${C.ink};word-break:break-all;">${esc(short(label))}</td>
      <td width="30%" style="padding:3px 0;">
        ${T('width="100%" style="border-collapse:collapse;"',
          `<tr><td width="${w}%" style="background:${color};height:6px;line-height:6px;font-size:0;border-radius:3px;">&nbsp;</td><td>&nbsp;</td></tr>`)}
      </td>
      <td width="12%" align="right" style="padding:3px 0 3px 8px;font:600 12px/1.5 ${FONT};color:${C.muted};white-space:nowrap;">${fmt(count)}</td>
    </tr>`;
      })
      .join("")
  );
}

// 防禦戰報的一列：做了什麼 → 結果
function defenceRow(name, detail, count, action, verdict, level) {
  const color = level === 2 ? C.bad : level === 1 ? C.warn : C.moss;
  return `<tr>
    <td width="34%" style="padding:10px 12px;border-top:1px solid ${C.border};font:400 13px/1.5 ${FONT};color:${C.ink};">
      ${name}<div style="font:400 11px/1.5 ${FONT};color:${C.muted};padding-top:2px;">${detail}</div>
    </td>
    <td width="12%" align="right" style="padding:10px 8px;border-top:1px solid ${C.border};font:700 15px/1.5 ${FONT};color:${C.ink};white-space:nowrap;">${count}</td>
    <td width="36%" style="padding:10px 12px;border-top:1px solid ${C.border};font:400 12px/1.5 ${FONT};color:${C.muted};">${action}</td>
    <td width="18%" align="right" style="padding:10px 12px;border-top:1px solid ${C.border};font:600 12px/1.5 ${FONT};color:${color};white-space:nowrap;">${verdict}</td>
  </tr>`;
}

// ── 組信 ─────────────────────────────────────────────────────────────
const maxPath = Math.max(...l.top_path.map((r) => n(r[0])), 1);
const maxIp = Math.max(...l.top_ip.map((r) => n(r[0])), 1);
const maxBad = Math.max(...l.top_bad.map((r) => n(r[0])), 1);

const todo = findings.length
  ? findings
      .map(
        (f, i) => `<tr><td style="padding:${i ? 8 : 0}px 0 0 0;font:400 13px/1.6 ${FONT};color:${C.ink};">
        <span style="color:${f.level === 2 ? C.bad : C.warn};font-weight:700;">${f.level === 2 ? "必做" : "留意"}</span>
        　${esc(f.what)}
        <div style="font:400 12px/1.6 ${FONT};color:${C.muted};padding-top:2px;">→ ${esc(f.why)}</div></td></tr>`
      )
      .join("")
  : `<tr><td style="font:400 13px/1.6 ${FONT};color:${C.ink};">沒有。昨天所有惡意流量都在進到網站程式之前就被切斷，系統各項也都在正常範圍。</td></tr>`;

const jailRows = l.jail
  .map(
    ([name, cur, tot]) => `<tr>
      <td style="padding:5px 0;font:400 12px/1.5 ${FONT};color:${C.muted};">${esc(name)}</td>
      <td align="right" style="padding:5px 0;font:400 12px/1.5 ${FONT};color:${C.ink};white-space:nowrap;">封鎖中 <b>${esc(cur || "0")}</b>　累計 ${esc(tot || "0")}</td>
    </tr>`
  )
  .join("");

const leakBlock =
  n(s.leak) > 0
    ? `<div style="margin-top:10px;padding:12px;background:${C.badBg};border-left:3px solid ${C.badLine};font:400 12px/1.7 ${FONT};color:${C.ink};">
        <b>漏網的探測路徑</b>（這些命中掃描特徵、但沒吃到 444，等於是被當成一般請求丟給網站程式）：<br>
        ${l.leak_path.map(([c, p]) => `${esc(short(p, 60))} × ${fmt(c)}`).join("<br>")}
        <br><br>處理方式：把樣式補進 <code>deploy/nginx.conf</code> 的 444 location，重跑 <code>nginx -s reload</code>。
       </div>`
    : "";

const html = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Avalo 每日簡報 ${esc(s.period)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${V.emoji} ${V.word}：${esc(V.line)}　請求 ${fmt(total)}、攔下 ${fmt(blocked)}</div>
${T(`width="100%" style="background:${C.paper};"`, `<tr><td align="center" style="padding:20px 10px;">
${T(`width="640" style="max-width:640px;background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;"`, `

<!-- 抬頭 -->
<tr><td style="background:${C.ink};padding:18px 24px;">
  ${T('width="100%"', `<tr>
    <td style="font:600 15px/1.4 ${FONT};color:#F0EBE3;letter-spacing:.06em;">AVALO　每日簡報</td>
    <td align="right" style="font:400 12px/1.4 ${FONT};color:#A79E92;">avalokite.xyz</td>
  </tr>`)}
  <div style="font:400 12px/1.6 ${FONT};color:#A79E92;padding-top:4px;">統計區間 ${esc(s.period)}（UTC 整日）</div>
</td></tr>

<!-- 結論 -->
<tr><td style="background:${V.bg};border-bottom:1px solid ${C.border};padding:20px 24px;">
  <div style="font:700 20px/1.3 ${FONT};color:${V.fg};">${V.emoji}　${V.word}</div>
  <div style="font:400 13px/1.6 ${FONT};color:${C.ink};padding-top:4px;">${esc(V.line)}</div>
  <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
  <div style="font:600 12px/1.4 ${FONT};color:${C.ink};letter-spacing:.04em;">今天需要你做的事</div>
  <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
  ${T('width="100%"', todo)}
</td></tr>

${section(
  "① 有沒有被打？擋住了嗎？",
  "先看最後一欄。「擋下」代表請求在碰到網站程式之前就被切斷，資料庫、後台、檔案都沒被碰到。",
  `<div style="padding:14px;background:${n(s.leak) > 0 ? C.badBg : C.okBg};border-radius:8px;font:400 13px/1.7 ${FONT};color:${C.ink};">
      昨天有 <b>${fmt(blocked)}</b> 次帶惡意的請求，其中 <b>${fmt(s.s444)}</b> 次是掃描探測（找 .env、wp-admin 這類檔案）、<b>${fmt(s.s429)}</b> 次是超速洗版。
      ${n(s.leak) > 0
        ? `這些都擋下了，但<b style="color:${C.bad}">另有 ${fmt(s.leak)} 次探測穿過攔截規則、被送進網站程式</b>，要補樣式。`
        : `全部在 nginx 這一層就被切斷連線，<b>沒有任何一次進到網站程式</b>。`}
      ${n(s.probe_redirect) > 0 ? `另有 ${fmt(s.probe_redirect)} 次探測只拿到 301 導轉——沒進到程式，但 fail2ban 認不得這種紀錄，等於白放它走。` : ""}
      ${n(s.bans) > 0 ? `另外 fail2ban 昨天新封鎖了 <b>${fmt(s.bans)}</b> 個 IP。` : ""}
   </div>
   <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
   ${T(`width="100%" style="border:1px solid ${C.border};border-radius:8px;border-collapse:separate;"`,
      defenceRow("掃描探測", `來自 ${fmt(s.probe_ips)} 個 IP，正常訪客不會產生`, fmt(s.s444) + " 次", "nginx 回 444 直接斷線<br>fail2ban 一擊即封 1 天", "已擋下", 0) +
      defenceRow(
        "漏網檢查",
        "命中掃描特徵、卻被送進網站程式的請求" +
          (n(s.probe_redirect) > 0
            ? `<br>另有 ${fmt(s.probe_redirect)} 次只拿到 301 導轉（沒進程式，但 fail2ban 抓不到）`
            : ""),
        fmt(s.leak) + " 次",
        n(s.leak) > 0 ? "被當成一般請求交給 Next" : "攔截樣式覆蓋完整",
        n(s.leak) > 0 ? "要補樣式" : "沒有漏網",
        n(s.leak) > 0 ? 2 : 0
      ) +
      defenceRow("洗版／超速", "超過每秒限制的請求", fmt(s.s429) + " 次", "nginx 回 429；持續洗版者交給 fail2ban", "已限流", 0) +
      defenceRow("後台猜密碼", `失敗來自 ${fmt(s.authfail_ip)} 個 IP`, fmt(s.authfail) + " 次", "同 IP 失敗 5 次封鎖 1 小時", n(s.authfail) >= 10 ? "有人在試" : "沒被攻破", n(s.authfail) >= 10 ? 1 : 0) +
      defenceRow("後台成功登入", "包含你自己登入的次數", fmt(s.authok) + " 次", n(s.authok) > 0 ? "確認是你本人" : "昨天沒有人登入成功", n(s.authok) > 0 ? "請確認" : "無", n(s.authok) > 0 ? 1 : 0) +
      defenceRow("網域亂指過來", "把別的網域 A 記錄指到這台機器", fmt(s.rejected) + " 次", "default server 直接斷線", "已擋下", 0)
   )}
   ${leakBlock}
   <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
   ${T(`width="100%" style="background:${C.paper};border-radius:8px;"`, `<tr><td style="padding:12px 14px;">
      <div style="font:600 12px/1.4 ${FONT};color:${C.ink};padding-bottom:6px;">fail2ban 目前狀態</div>
      ${T('width="100%"', jailRows)}
   </td></tr>`)}
   <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
   <div style="font:600 12px/1.4 ${FONT};color:${C.ink};padding-bottom:6px;">產生 4xx 最多的 IP（可疑名單）</div>
   ${barRows(l.top_bad, maxBad, C.wood)}`
)}

${section(
  "② 有多少人來？",
  `${fmt(s.err4)} 個 4xx 裡面，${fmt(blocked)} 個其實是「系統主動攔截」的動作，不是網站壞掉。真正該在意的是 5xx 與非掃描的 404。`,
  `${cards([
    { value: fmt(total), label: "總請求" },
    { value: fmt(s.uniq_ip), label: "不重複 IP" },
    { value: fmt(s.forms), label: "表單送出" },
    { value: pct(okReq, total) + "%", label: "正常回應率", color: pct(okReq, total) >= 90 ? C.moss : C.warn },
  ])}
   <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
   ${T(`width="100%" style="border:1px solid ${C.border};border-radius:8px;"`, `<tr><td style="padding:12px 14px;">
     ${T('width="100%"',
       [
         ["2xx／3xx　正常回應", fmt(okReq), C.moss],
         ["444／429　主動攔截", fmt(blocked), C.wood],
         ["404　找不到頁面（多為亂猜的機器人，若出現自家路徑就是壞連結）", fmt(s.s404), C.muted],
         ["5xx　網站自己出錯（唯一代表「我方有問題」的數字）", fmt(s.s5xx), n(s.s5xx) > 0 ? C.bad : C.muted],
       ]
         .map(([label, value, color]) => `<tr>
            <td style="padding:4px 0;font:400 12px/1.6 ${FONT};color:${C.muted};">${label}</td>
            <td align="right" style="padding:4px 0;font:700 13px/1.6 ${FONT};color:${color};white-space:nowrap;">${value}</td>
          </tr>`)
         .join("")
     )}
   </td></tr>`)}
   ${n(s.local_req) > 0
      ? `<div style="padding-top:8px;font:400 11px/1.6 ${FONT};color:${C.muted};">另有 ${fmt(s.local_req)} 次來自本機（健康檢查與手動測試），已從以上所有數字排除。</div>`
      : ""}
   <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
   <div style="font:600 12px/1.4 ${FONT};color:${C.ink};padding-bottom:6px;">熱門路徑</div>
   ${barRows(l.top_path, maxPath, C.moss)}
   <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
   <div style="font:600 12px/1.4 ${FONT};color:${C.ink};padding-bottom:6px;">流量最大的 IP（拿到 2xx/3xx，多為真人與搜尋引擎爬蟲）</div>
   ${barRows(l.top_ip, maxIp, C.moss)}
   ${l.top_404.length
      ? `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
         <div style="font:600 12px/1.4 ${FONT};color:${C.ink};padding-bottom:6px;">最常見的 404（認得出來的路徑＝自家壞連結）</div>
         ${barRows(l.top_404, Math.max(...l.top_404.map((r) => n(r[0])), 1), C.muted)}`
      : ""}`
)}

${section(
  "③ 生意",
  "這一段跟安全無關，是昨天實際發生的事。",
  cards([
    { value: fmt(s.new_inquiry), label: "新詢問單" },
    { value: fmt(s.new_order), label: "新訂單" },
    { value: fmt(s.new_paid), label: "付款成功" },
    { value: fmt(s.db_order), label: "訂單累計" },
  ])
)}

${section(
  "④ 機器狀況",
  "有問題的項目已經列在最上面的待辦；這裡是完整數值。",
  T(`width="100%" style="border:1px solid ${C.border};border-radius:8px;"`, `<tr><td style="padding:6px 14px;">
    ${T('width="100%"',
      [
        ["服務", s.svc === "active" ? "運行中" : `${s.svc}`, s.svc === "active" ? 0 : 2],
        ["磁碟", `${s.disk_pct}% 已用（${s.disk_txt}）`, n(s.disk_pct) >= 85 ? 2 : n(s.disk_pct) >= 75 ? 1 : 0],
        ["記憶體", `${s.mem_txt}　swap ${s.swap_txt}`, 0],
        ["HTTPS 憑證", `剩 ${s.cert_days} 天（${s.cert_end}）`, n(s.cert_days) <= 20 ? 2 : n(s.cert_days) <= 30 ? 1 : 0],
        ["資料庫", `詢問單 ${s.db_inquiry}　訂單 ${s.db_order}　付款 ${s.db_payment}`, s.db_inquiry === "ERR" ? 1 : 0],
        ["最近備份", s.backup ? `${esc(s.backup)}（${s.backup_age_h} 小時前）` : "找不到備份", !s.backup || n(s.backup_age_h) > 48 ? 2 : n(s.backup_age_h) > 30 ? 1 : 0],
      ]
        .map(([label, value, level]) => `<tr>
          <td width="26%" style="padding:8px 0;border-bottom:1px solid ${C.paper};font:400 12px/1.6 ${FONT};color:${C.muted};">${label}</td>
          <td style="padding:8px 0;border-bottom:1px solid ${C.paper};font:400 12px/1.6 ${FONT};color:${C.ink};">${value}</td>
          <td width="10%" align="right" style="padding:8px 0;border-bottom:1px solid ${C.paper};font:600 12px/1.6 ${FONT};color:${level === 2 ? C.bad : level === 1 ? C.warn : C.moss};">${level === 2 ? "異常" : level === 1 ? "注意" : "正常"}</td>
        </tr>`)
        .join("")
    )}
  </td></tr>`)
)}

<!-- 頁尾 -->
<tr><td style="padding:24px;">
  <div style="padding:14px;background:${C.paper};border-radius:8px;font:400 12px/1.7 ${FONT};color:${C.muted};">
    <b style="color:${C.ink};">這封信同時是心跳訊號。</b>整台機器掛掉時連警報都寄不出來，所以「某天沒收到這封信」本身就是異常，值得進去看一下。<br>
    由 <code>deploy/daily-report.sh</code> 每天 台北時間 08:00 產生。
  </div>
</td></tr>
`)}
</td></tr>`)}
</body></html>`;

// ── 純文字版（不吃 HTML 的信箱、以及日後 grep 用）─────────────────────
const text = `Avalo 每日簡報　${s.period}（UTC 整日）

${V.emoji} ${V.word}　${V.line}

【今天需要你做的事】
${findings.length ? findings.map((f) => `  ${f.level === 2 ? "必做" : "留意"}　${f.what}\n        → ${f.why}`).join("\n") : "  沒有。昨天所有惡意流量都在進到網站程式之前就被切斷。"}

【有沒有被打？擋住了嗎？】
  掃描探測      ${fmt(s.s444)} 次（${fmt(s.probe_ips)} 個 IP）→ nginx 444 斷線，已擋下
  漏網檢查      ${fmt(s.leak)} 次 ${n(s.leak) > 0 ? "→ 被送進網站程式，要補 nginx 樣式" : "→ 沒有漏網"}
  只拿到導轉    ${fmt(s.probe_redirect)} 次${n(s.probe_redirect) > 0 ? "（沒進程式，但 fail2ban 抓不到，該補 include）" : ""}
  洗版限流      ${fmt(s.s429)} 次 → 已限流
  後台猜密碼    ${fmt(s.authfail)} 次（${fmt(s.authfail_ip)} 個 IP）
  後台成功登入  ${fmt(s.authok)} 次
  網域亂指      ${fmt(s.rejected)} 次 → 已擋下
  昨天新封鎖    ${fmt(s.bans)} 個 IP
${l.jail.map(([name, cur, tot]) => `  ${name.padEnd(18)} 封鎖中 ${cur}／累計 ${tot}`).join("\n")}

【流量】
  總請求 ${fmt(total)}　不重複 IP ${fmt(s.uniq_ip)}　表單送出 ${fmt(s.forms)}　正常回應率 ${pct(okReq, total)}%
  2xx/3xx ${fmt(okReq)}　主動攔截 ${fmt(blocked)}　404 ${fmt(s.s404)}　5xx ${fmt(s.s5xx)}${n(s.local_req) > 0 ? `\n  （另有 ${fmt(s.local_req)} 次來自本機的健康檢查與手動測試，已排除）` : ""}

  熱門路徑：
${l.top_path.map(([c, p]) => `    ${String(c).padStart(6)} ${short(p, 60)}`).join("\n")}
  流量最大的 IP：
${l.top_ip.map(([c, p]) => `    ${String(c).padStart(6)} ${p}`).join("\n")}
  產生 4xx 最多的 IP：
${l.top_bad.map(([c, p]) => `    ${String(c).padStart(6)} ${p}`).join("\n")}

【生意】
  新詢問單 ${fmt(s.new_inquiry)}　新訂單 ${fmt(s.new_order)}　付款成功 ${fmt(s.new_paid)}
  累計：詢問單 ${s.db_inquiry}　訂單 ${s.db_order}　付款 ${s.db_payment}

【機器】
  服務 ${s.svc}　磁碟 ${s.disk_pct}%（${s.disk_txt}）　記憶體 ${s.mem_txt}　swap ${s.swap_txt}
  憑證 剩 ${s.cert_days} 天（${s.cert_end}）
  最近備份 ${s.backup || "找不到"}（${s.backup_age_h} 小時前）

這封信同時是心跳訊號：某天沒收到，代表伺服器或排程出了問題。`;

// 主旨也要能單獨判讀——收件匣一眼就知道昨天有沒有事
const subject =
  `[Avalo] ${V.emoji} 每日簡報 ${s.period_short || s.period}　` +
  (worst > 0 ? `${findings.length} 項待處理　` : "一切正常　") +
  `請求 ${fmt(total)}／攔下 ${fmt(blocked)}`;

if (process.argv.includes("--stdout")) {
  process.stdout.write(html);
} else if (process.argv.includes("--text")) {
  process.stdout.write(subject + "\n\n" + text + "\n");
} else {
  const { send } = require("./notify.js");
  send({ subject, text, html }).catch((err) => {
    console.error("[report] 寄送失敗:", err.message);
    process.exit(1);
  });
}
