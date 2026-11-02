#!/usr/bin/env bash
# 打本機 /api/cron/<name>。秘密只從伺服器 .env 讀，不寫進 repo。
#
# 用法（avalo crontab）：
#   15 3 * * * /opt/avalo/app/deploy/run-cron.sh care-links dunning >> /opt/avalo/cron-care.log 2>&1
#   0  4 1 * * /opt/avalo/app/deploy/run-cron.sh geo-prompts >> /opt/avalo/cron-geo.log 2>&1
#   0  5 * * 1 /opt/avalo/app/deploy/run-cron.sh indexnow >> /opt/avalo/cron-indexnow.log 2>&1
set -euo pipefail
ENV=/opt/avalo/app/.env
CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV" | cut -d= -f2- | tr -d '"')"
if [ -z "${CRON_SECRET}" ]; then
  echo "CRON_SECRET missing in $ENV" >&2
  exit 1
fi
for ep in "$@"; do
  echo "--- $(date -Is) $ep"
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "http://127.0.0.1:3000/api/cron/$ep" || true
  echo
done
