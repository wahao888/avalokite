#!/usr/bin/env bash
# 每日 SQLite 一致性快照。
# 預設存「本機」（防資料損毀／誤刪／壞 migration，立即可用、無需 AWS）。
# 若設了 BACKUP_S3_BUCKET 且機器有 aws（掛了含 s3:PutObject 的 IAM Role）→ 另外上傳 S3，才防得了 EBS 整顆掉。
# crontab（avalo 使用者）：15 3 * * * /opt/avalo/app/deploy/backup-db.sh >> /opt/avalo/backup.log 2>&1
set -euo pipefail

DB=/opt/avalo/app/prisma/prod.db
LOCAL_DIR=/opt/avalo/backups
KEEP=30
STAMP=$(date +%Y%m%d-%H%M%S)

if [ ! -f "$DB" ]; then
  echo "[$(date)] backup FAILED: db not found at $DB" >&2
  exit 1
fi

mkdir -p "$LOCAL_DIR"
OUT="$LOCAL_DIR/avalo-$STAMP.db.gz"
TMP="/tmp/avalo-$STAMP.db"

# .backup 取一致性快照（避免 cp 撞上寫入交易）
sqlite3 "$DB" ".backup '$TMP'"
gzip -c "$TMP" > "$OUT"
rm -f "$TMP"

# 本機只保留最近 KEEP 份
ls -1t "$LOCAL_DIR"/avalo-*.db.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

# 選配：離線備份到 S3（需先掛 IAM Role 並設 BACKUP_S3_BUCKET）
if [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws >/dev/null 2>&1; then
  aws s3 cp "$OUT" "s3://$BACKUP_S3_BUCKET/avalo-db/$STAMP.db.gz" --only-show-errors
  aws s3 ls "s3://$BACKUP_S3_BUCKET/avalo-db/" | sort | head -n -"$KEEP" | awk '{print $4}' | while read -r key; do
    [ -n "$key" ] && aws s3 rm "s3://$BACKUP_S3_BUCKET/avalo-db/$key" --only-show-errors
  done
  echo "[$(date)] backup ok (local + s3): $STAMP"
else
  echo "[$(date)] backup ok (local only): $STAMP  — 設 BACKUP_S3_BUCKET + IAM Role 可加離線備援"
fi
