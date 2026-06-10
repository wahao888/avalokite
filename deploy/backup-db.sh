#!/usr/bin/env bash
# 每日 SQLite 備份 → S3（EC2 需掛 IAM Role 含 s3:PutObject 權限）
# crontab（avalo 使用者）：15 3 * * * /opt/avalo/app/deploy/backup-db.sh >> /opt/avalo/backup.log 2>&1
set -euo pipefail

DB=/opt/avalo/app/prisma/prod.db
BUCKET="${BACKUP_S3_BUCKET:?請設定 BACKUP_S3_BUCKET 環境變數}"
STAMP=$(date +%Y%m%d-%H%M%S)
TMP=/tmp/avalo-$STAMP.db

# 使用 sqlite3 .backup 確保一致性快照（避免直接 cp 撞上寫入）
sqlite3 "$DB" ".backup '$TMP'"
gzip "$TMP"
aws s3 cp "$TMP.gz" "s3://$BUCKET/avalo-db/$STAMP.db.gz" --only-show-errors
rm -f "$TMP.gz"

# 保留最近 30 份，其餘清掉
aws s3 ls "s3://$BUCKET/avalo-db/" | sort | head -n -30 | awk '{print $4}' | while read -r key; do
  [ -n "$key" ] && aws s3 rm "s3://$BUCKET/avalo-db/$key" --only-show-errors
done

echo "[$(date)] backup ok: $STAMP"
