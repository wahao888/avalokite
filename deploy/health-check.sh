#!/usr/bin/env bash
# Avalo 健康檢查（伺服器 cron 每 5 分鐘跑一次）。
# 只在「狀態從好變壞」時寄信，並有冷卻時間，避免一直掛就一直寄。
#
# crontab（root）：*/5 * * * * /opt/avalo/app/deploy/health-check.sh >> /opt/avalo/health.log 2>&1
# 用 root 跑才讀得到 journalctl 與憑證檔；寄信時再降權到 avalo。
#
# 限制：這支跑在伺服器上，整台機器掛掉時它也不會動——那種情況要靠每日簡報
# （daily-report.sh）沒寄來當作訊號，或另外接外部監控服務。
set -uo pipefail

APP=/opt/avalo/app
STATE_DIR=/opt/avalo/health-state
COOLDOWN=3600 # 同一項目最短再寄信間隔（秒）
DISK_MAX=85   # 磁碟使用率警戒（%）
CERT_MIN=20   # 憑證剩餘天數警戒

mkdir -p "$STATE_DIR"
now=$(date +%s)

# alert <key> <主旨> <內文>：同一 key 在冷卻時間內只寄一次
alert() {
  local key=$1 subject=$2 body=$3
  local f="$STATE_DIR/$key"
  if [ -f "$f" ] && [ $((now - $(cat "$f"))) -lt "$COOLDOWN" ]; then
    echo "[$(date)] $key 仍異常（冷卻中，不重寄）"
    return
  fi
  echo "$now" > "$f"
  echo "[$(date)] ALERT $key: $subject"
  sudo -u avalo node "$APP/deploy/notify.js" "$subject" "$body" || echo "[$(date)] 寄信失敗"
}

# 恢復時清掉狀態，下次再壞才會立刻通知
recover() {
  local key=$1
  if [ -f "$STATE_DIR/$key" ]; then
    rm -f "$STATE_DIR/$key"
    echo "[$(date)] $key 已恢復"
    sudo -u avalo node "$APP/deploy/notify.js" "[Avalo] ✅ 已恢復：$key" "先前的異常「$key」已恢復正常。" || true
  fi
}

# 1) 網站是否還活著（走本機，排除網路因素）
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3000/zh-TW || echo "000")
if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
  recover "site-down"
else
  alert "site-down" "[Avalo] 🔴 網站異常（HTTP $code）" \
    "本機健康檢查 http://127.0.0.1:3000/zh-TW 回應 $code。

服務狀態：
$(systemctl is-active avalo 2>&1)

最近的錯誤日誌：
$(journalctl -u avalo -n 20 --no-pager 2>&1 | tail -20)"
fi

# 2) 磁碟
disk=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ -n "$disk" ] && [ "$disk" -ge "$DISK_MAX" ]; then
  alert "disk-full" "[Avalo] ⚠️ 磁碟使用率 ${disk}%" \
    "根目錄使用率已達 ${disk}%（警戒值 ${DISK_MAX}%）。

$(df -h / | tail -1)

最肥的目錄：
$(du -xh /opt /var/log 2>/dev/null | sort -rh | head -10)"
else
  recover "disk-full"
fi

# 3) 憑證到期
expiry=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/avalokite.xyz/fullchain.pem 2>/dev/null | cut -d= -f2)
if [ -n "$expiry" ]; then
  days=$(( ($(date -d "$expiry" +%s) - now) / 86400 ))
  if [ "$days" -le "$CERT_MIN" ]; then
    alert "cert-expiring" "[Avalo] ⚠️ HTTPS 憑證剩 ${days} 天" \
      "avalokite.xyz 的憑證將於 $expiry 到期（剩 ${days} 天）。
自動續期理應在到期前 30 天生效，若已剩這麼少代表續期沒跑成功，請檢查：
  systemctl list-timers | grep certbot
  sudo certbot renew --dry-run"
  else
    recover "cert-expiring"
  fi
fi

echo "[$(date)] 檢查完成 site=$code disk=${disk}% cert=${days:-?}d"
