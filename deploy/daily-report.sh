#!/usr/bin/env bash
# Avalo 每日簡報（伺服器 cron，台北時間早上 8 點 = UTC 00:00）。
#
# crontab（root）：0 0 * * * /opt/avalo/app/deploy/daily-report.sh >> /opt/avalo/daily.log 2>&1
# 必須用 root 跑：要讀 /var/log/nginx（root:adm）與 fail2ban-client（需 root），
# avalo 使用者沒有免密碼 sudo，掛在 avalo 底下會整份統計都是空的。
#
# 這封信同時是「心跳」：整台機器掛掉時 health-check.sh 也寄不出信，
# 所以「今天沒收到簡報」本身就是異常訊號。
set -uo pipefail

APP=/opt/avalo/app
LOG=/var/log/nginx/access.log
YDAY=$(date -u -d "yesterday" +%d/%b/%Y)

# 昨天的紀錄可能已被 logrotate 轉到 access.log.1／.2.gz，所以要一起掃。
# 用 zgrep 才讀得到壓縮過的那幾份。找不到符合時 grep 會回非 0，
# 這裡一律接 `|| true`，別用 `|| echo 0`——那會讓輸出多一行 0，主旨就會斷行。
lines() { zgrep -h "$YDAY" "$LOG" "$LOG".1 "$LOG".*.gz 2>/dev/null || true; }

ALL=$(lines)
count() { printf '%s' "$1" | grep -c . 2>/dev/null || true; }

total=$(count "$ALL")
uniq_ip=$(printf '%s' "$ALL" | awk '{print $1}' | sort -u | grep -c . || true)
err4=$(printf '%s' "$ALL" | awk '$9 ~ /^4/' | grep -c . || true)
err5=$(printf '%s' "$ALL" | awk '$9 ~ /^5/' | grep -c . || true)
top_path=$(printf '%s' "$ALL" | awk '{print $7}' | cut -d? -f1 | sort | uniq -c | sort -rn | head -8)
forms=$(printf '%s' "$ALL" | grep -cE 'POST /api/(contact|wenshan/quote)' || true)

# 流量 Top IP 要把「正常」與「可疑」分開列。
# 原本只有一份混合名單，排在前面的其實多半是搜尋引擎／AI 爬蟲（拿 200、爬 robots.txt），
# 看起來像攻擊者但不是——2026-07-31 的簡報就造成過這種誤讀。
# 判準：產生 4xx 的比例。444 是 nginx 對 .env/wp-admin 之類探測的回應，只有攻擊者會拿到。
top_ip=$(printf '%s' "$ALL" | awk '$9 ~ /^[23]/ {print $1}' | sort | uniq -c | sort -rn | head -5)
top_bad=$(printf '%s' "$ALL" | awk '$9 ~ /^4/ {print $1}' | sort | uniq -c | sort -rn | head -5)
probes=$(printf '%s' "$ALL" | awk '$9 == 444' | grep -c . || true)
probe_ips=$(printf '%s' "$ALL" | awk '$9 == 444 {print $1}' | sort -u | grep -c . || true)

# 後台登入失敗只存在於 journal——成功與失敗在 nginx log 裡都是 303，無法辨識
authfail=$(journalctl -u avalo --since "yesterday" --until "today" --no-pager 2>/dev/null \
  | grep -c "\[auth fail\]" || true)
authfail_ip=$(journalctl -u avalo --since "yesterday" --until "today" --no-pager 2>/dev/null \
  | grep -oE "\[auth fail\] \S+ ip=\S+" | awk '{print $NF}' | sort -u | grep -c . || true)

bans=$(for j in sshd nginx-limit-req nginx-botsearch avalo-scan avalo-honeypath avalo-auth; do
  printf "  %-18s 目前封鎖 %s／累計 %s\n" "$j" \
    "$(fail2ban-client status $j 2>/dev/null | grep 'Currently banned' | grep -oE '[0-9]+$')" \
    "$(fail2ban-client status $j 2>/dev/null | grep 'Total banned' | grep -oE '[0-9]+$')"
done)

cert_end=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/avalokite.xyz/fullchain.pem 2>/dev/null | cut -d= -f2)
cert_days=$(( ($(date -d "$cert_end" +%s) - $(date +%s)) / 86400 ))

db_rows=$(sqlite3 "$APP/prisma/prod.db" \
  "select '詢問單 '||(select count(*) from Inquiry)||'　訂單 '||(select count(*) from \"Order\")||'　付款 '||(select count(*) from Payment);" 2>/dev/null || echo "讀取失敗")

body="Avalo 每日簡報（統計區間：$YDAY UTC）

── 流量 ──
  總請求      $total
  不重複 IP   $uniq_ip
  4xx／5xx    $err4 ／ $err5
  表單送出    $forms 次

  正常流量 Top 5（拿到 2xx/3xx，多為真人與搜尋引擎爬蟲）：
$top_ip

  熱門路徑 Top 8：
$top_path

── 可疑活動 ──
  探測請求    $probes 次，來自 $probe_ips 個 IP
              （444＝有人在找 .env／wp-admin／.git 之類，正常訪客不會產生）

  產生 4xx Top 5（這份才是該注意的名單）：
$top_bad

  後台登入失敗  $authfail 次，來自 $authfail_ip 個 IP
              （登入成功與失敗在 nginx log 都是 303，這項只能從 journal 取得）

── 防護 ──
$bans

── 系統 ──
  服務狀態    $(systemctl is-active avalo)
  磁碟        $(df -h / | tail -1 | awk '{print $5" 已用（"$3"／"$2"）"}')
  記憶體      $(free -m | awk '/^Mem:/{print $3"MB／"$2"MB 已用"}')　swap $(free -m | awk '/^Swap:/{print $3"MB／"$2"MB"}')
  憑證        剩 $cert_days 天（$cert_end）
  資料庫      $db_rows
  最近備份    $(ls -1t /opt/avalo/backups/*.db.gz 2>/dev/null | head -1 | xargs -r basename)

── 說明 ──
這封信同時是心跳訊號。若某天沒收到，代表伺服器或排程出了問題，值得進去看一下。"

sudo -u avalo node "$APP/deploy/notify.js" "[Avalo] 每日簡報 $(date -u -d yesterday +%m/%d)　請求 $total／4xx $err4" "$body"
