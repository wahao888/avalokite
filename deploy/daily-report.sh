#!/usr/bin/env bash
# Avalo 每日簡報（伺服器 cron，台北時間早上 8 點 = UTC 00:00）。
#
# crontab（root）：0 0 * * * /opt/avalo/app/deploy/daily-report.sh >> /opt/avalo/daily.log 2>&1
# 必須用 root 跑：要讀 /var/log/nginx（root:adm）與 fail2ban-client（需 root），
# avalo 使用者沒有免密碼 sudo，掛在 avalo 底下會整份統計都是空的。
#
# 分工：這支只負責「採集」，輸出一份 TSV；判讀與排版在 deploy/report-render.js。
# 為什麼分兩支：信要排成 HTML 儀表板，在 bash 裡拼 HTML 會失控，
# 而且拆開後可以本機預覽版面（見 report-render.js 開頭的用法）。
#
# 手動除錯：
#   sudo deploy/daily-report.sh --dry    只印採集到的原始數據，不寄信
#   sudo deploy/daily-report.sh --text   印純文字版與主旨，不寄信
#
# 這封信同時是「心跳」：整台機器掛掉時 health-check.sh 也寄不出信，
# 所以「今天沒收到簡報」本身就是異常訊號。
set -uo pipefail

APP=/opt/avalo/app
LOG=/var/log/nginx/access.log
YDAY=$(date -u -d "yesterday" +%d/%b/%Y)
YDAY_ISO=$(date -u -d "yesterday" +%Y-%m-%d)
D0=$(date -u -d "yesterday 00:00:00" +%s)000
D1=$(date -u -d "today 00:00:00" +%s)000

# 昨天的紀錄可能已被 logrotate 轉到 access.log.1／.2.gz，所以要一起掃。
# 用 zgrep 才讀得到壓縮過的那幾份。找不到符合時 grep 會回非 0，
# 這裡一律接 `|| true`，別用 `|| echo 0`——那會讓輸出多一行 0，欄位就會錯位。
lines() { zgrep -h "$YDAY" "$LOG" "$LOG".1 "$LOG".*.gz 2>/dev/null || true; }
ALL=$(lines)
count() { printf '%s' "$1" | grep -c . 2>/dev/null || true; }

# 一行一筆、tab 分欄丟給 render。值裡面可能有攻擊者送來的路徑，
# 但 nginx 已經把 log 欄位裡的 " 與控制字元轉成 \xNN，不會有換行或跳脫問題。
emit() { local IFS=$'\t'; printf '%s\n' "$*"; }

# nginx.conf 裡那組「一律回 444」的掃描路徑樣式，這裡必須跟它保持一致。
# 用 [.] 而不是 \. ：值是透過 awk -v 傳進去的，反斜線會先被 awk 的跳脫處理吃掉一層。
PROBE_RE='(^|/)(wp-admin|wp-login|wp-content|xmlrpc[.]php|phpmyadmin|[.]env|[.]git|[.]svn|[.]aws|[.]ds_store|vendor/|cgi-bin/|autodiscover|eval-stdin[.]php|server-status)'

collect() {
  emit period "$YDAY"
  emit period_short "$(date -u -d yesterday +%m/%d)"

  # ── 流量：狀態碼一次掃完 ──
  # leak＝命中掃描樣式、卻不是 444 的請求。這是整封信最重要的一個數字：
  # 它代表「攔截樣式有缺口，這些探測被當成一般請求丟給了網站程式」。
  # 2026-07-31 的 /saas/.env 就是這種情形（樣式當時只綁根目錄）。
  eval "$(printf '%s' "$ALL" | awk -v re="$PROBE_RE" '
    { st=$9; p=tolower($7)
      if (st ~ /^2/) s2++
      else if (st ~ /^3/) s3++
      else if (st == 444) s444++
      else if (st == 429) s429++
      else if (st == 404) s404++
      else if (st ~ /^4/) s4o++
      else if (st ~ /^5/) s5++
      if (st ~ /^4/) e4++
      # 探測請求的下場要分三種，嚴重度差很多：
      #   444        → 攔下了
      #   3xx        → 只拿到導轉。沒被送進程式，但代表那個 server 區塊少了攔截規則，
      #                access.log 記的是 301，fail2ban 的 honeypath 抓不到（2026-08-26 修的就是這個）
      #   2xx/404/405 → 真的交給 Next 處理了，這才是「漏網」
      #   其餘（400/403/429）→ nginx 自己擋掉，算擋下
      if (p ~ re) {
        if (st ~ /^3/) redir++
        else if (st ~ /^2/ || st == 404 || st == 405) leak++
      }
    }
    END { printf "s2xx=%d s3xx=%d s444=%d s429=%d s404=%d s4other=%d s5xx=%d err4=%d leak=%d redir=%d\n",
          s2, s3, s444, s429, s404, s4o, s5, e4, leak, redir }')"

  emit total "$(count "$ALL")"
  emit uniq_ip "$(printf '%s' "$ALL" | awk '{print $1}' | sort -u | grep -c . || true)"
  emit s2xx "$s2xx"; emit s3xx "$s3xx"; emit s404 "$s404"; emit s429 "$s429"
  emit s444 "$s444"; emit s4other "$s4other"; emit s5xx "$s5xx"; emit err4 "$err4"
  emit leak "$leak"
  emit probe_redirect "$redir"
  emit forms "$(printf '%s' "$ALL" | grep -cE 'POST /api/(contact|wenshan/quote)' || true)"
  emit probe_ips "$(printf '%s' "$ALL" | awk '$9 == 444 {print $1}' | sort -u | grep -c . || true)"

  # 漏網的實際路徑：要補 nginx 樣式時就是照著這份補
  printf '%s' "$ALL" | awk -v re="$PROBE_RE" '($9 ~ /^2/ || $9 == 404 || $9 == 405) && tolower($7) ~ re {print $7}' \
    | cut -d'?' -f1 | sort | uniq -c | sort -rn | head -5 \
    | awk '{c=$1; $1=""; sub(/^ /,""); print "leak_path\t" c "\t" $0}'

  # 流量 Top IP 要把「正常」與「可疑」分開列。
  # 原本只有一份混合名單，排在前面的其實多半是搜尋引擎／AI 爬蟲（拿 200、爬 robots.txt），
  # 看起來像攻擊者但不是——2026-07-31 的簡報就造成過這種誤讀。
  printf '%s' "$ALL" | awk '$9 ~ /^[23]/ {print $1}' | sort | uniq -c | sort -rn | head -5 \
    | awk '{print "top_ip\t" $1 "\t" $2}'
  printf '%s' "$ALL" | awk '$9 ~ /^4/ {print $1}' | sort | uniq -c | sort -rn | head -5 \
    | awk '{print "top_bad\t" $1 "\t" $2}'
  printf '%s' "$ALL" | awk '{print $7}' | cut -d'?' -f1 | sort | uniq -c | sort -rn | head -8 \
    | awk '{c=$1; $1=""; sub(/^ /,""); print "top_path\t" c "\t" $0}'
  # 404 單獨列一份：認得出來的路徑＝自家壞連結，那才是要修的
  printf '%s' "$ALL" | awk '$9 == 404 {print $7}' | cut -d'?' -f1 | sort | uniq -c | sort -rn | head -5 \
    | awk '{c=$1; $1=""; sub(/^ /,""); print "top_404\t" c "\t" $0}'

  # 把別人的網域 A 記錄指到這台機器 → default server 回 444，另記一份 log
  emit rejected "$(zgrep -h "$YDAY" /var/log/nginx/rejected.log /var/log/nginx/rejected.log.* 2>/dev/null | grep -c . || true)"

  # ── 後台登入 ──
  # 成功與失敗在 nginx log 裡都是 303，只有 journal 分得出來。
  # 「成功幾次」是判斷有沒有被攻破的唯一依據，所以 src 的兩支 login route 都會記 [auth ok]。
  jrnl=$(journalctl -u avalo --since "yesterday" --until "today" --no-pager 2>/dev/null || true)
  emit authfail "$(printf '%s' "$jrnl" | grep -c "\[auth fail\]" || true)"
  emit authfail_ip "$(printf '%s' "$jrnl" | grep -oE "\[auth fail\] \S+ ip=\S+" | awk '{print $NF}' | sort -u | grep -c . || true)"
  emit authok "$(printf '%s' "$jrnl" | grep -c "\[auth ok\]" || true)"

  # ── fail2ban ──
  # 昨天「新封鎖」幾個 IP＝防護昨天實際動作了幾次（fail2ban.log 用伺服器本地時間，
  # 本機設為 UTC，與統計區間一致）。
  emit bans "$(zgrep -h "^$YDAY_ISO" /var/log/fail2ban.log /var/log/fail2ban.log.* 2>/dev/null | grep -c "] Ban " || true)"
  for j in sshd nginx-limit-req nginx-botsearch avalo-scan avalo-honeypath avalo-auth; do
    st=$(fail2ban-client status "$j" 2>/dev/null)
    emit jail "$j" \
      "$(printf '%s' "$st" | grep 'Currently banned' | grep -oE '[0-9]+$')" \
      "$(printf '%s' "$st" | grep 'Total banned' | grep -oE '[0-9]+$')"
  done

  # ── 系統 ──
  emit svc "$(systemctl is-active avalo)"
  emit disk_pct "$(df --output=pcent / | tail -1 | tr -dc '0-9')"
  emit disk_txt "$(df -h / | tail -1 | awk '{print $3"／"$2}')"
  emit mem_txt "$(free -m | awk '/^Mem:/{print $3"MB／"$2"MB"}')"
  emit swap_txt "$(free -m | awk '/^Swap:/{print $3"MB／"$2"MB"}')"

  cert_end=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/avalokite.xyz/fullchain.pem 2>/dev/null | cut -d= -f2)
  if [ -n "$cert_end" ]; then
    emit cert_end "$cert_end"
    emit cert_days "$(( ($(date -d "$cert_end" +%s) - $(date +%s)) / 86400 ))"
  fi

  DB="$APP/prisma/prod.db"
  sq() { sqlite3 "$DB" "$1" 2>/dev/null || echo ERR; }
  emit db_inquiry "$(sq 'select count(*) from Inquiry;')"
  emit db_order "$(sq 'select count(*) from "Order";')"
  emit db_payment "$(sq 'select count(*) from Payment;')"
  # Prisma 在 SQLite 把 DateTime 存成毫秒整數，所以直接用數字區間比對
  emit new_inquiry "$(sq "select count(*) from Inquiry where createdAt >= $D0 and createdAt < $D1;")"
  emit new_order "$(sq "select count(*) from \"Order\" where createdAt >= $D0 and createdAt < $D1;")"
  emit new_paid "$(sq "select count(*) from Payment where status='paid' and createdAt >= $D0 and createdAt < $D1;")"

  backup=$(ls -1t /opt/avalo/backups/*.db.gz 2>/dev/null | head -1)
  if [ -n "$backup" ]; then
    emit backup "$(basename "$backup")"
    emit backup_age_h "$(( ($(date +%s) - $(stat -c %Y "$backup")) / 3600 ))"
  fi
}

# 先落地再送：render 掛掉時還能把原始數據寄出來，
# 這封信是心跳，寧可醜也不能整天沒消息。
TSV=$(mktemp)
collect > "$TSV"

# --dry：只印採集結果不寄信（上伺服器查數字、或改完採集邏輯要驗證時用）
# --text：印純文字版與主旨，一樣不寄信
if [ "${1:-}" = "--dry" ]; then
  cat "$TSV"; rm -f "$TSV"; exit 0
fi
if [ "${1:-}" = "--text" ]; then
  sudo -u avalo node "$APP/deploy/report-render.js" --text < "$TSV"; rm -f "$TSV"; exit 0
fi
if ! sudo -u avalo node "$APP/deploy/report-render.js" < "$TSV"; then
  sudo -u avalo node "$APP/deploy/notify.js" \
    "[Avalo] ⚠️ 每日簡報排版失敗（附原始數據）" "$(cat "$TSV")"
fi
rm -f "$TSV"
