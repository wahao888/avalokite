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
#
# ⚠ BACKUP_S3_BUCKET 一定要自己從 .env 讀出來。
# 這支是 cron 跑的，而 cron **不會載入 .env**——原本只看
# ${BACKUP_S3_BUCKET:-} 的話，在 .env 設好了也永遠不會生效，
# 而 log 會一直印「local only」，看起來像值沒設對，實際是根本沒讀到。
# （2026-09-09 上線後查出來，跟 WAL 那個是同一種「靜靜跳過」的錯。）
ENV_FILE=/opt/avalo/app/.env
BUCKET="${BACKUP_S3_BUCKET:-}"
if [ -z "$BUCKET" ] && [ -r "$ENV_FILE" ]; then
  BUCKET=$(sed -n 's/^BACKUP_S3_BUCKET=//p' "$ENV_FILE" | tr -d '"'"'" | head -1)
fi

# ⚠ 不要只靠 `command -v aws`。cron 的 PATH 只有 /usr/bin:/bin，
# 而 aws cli 是 snap 裝的，住在 /snap/bin——互動 shell 找得到、cron 找不到。
# 這是今天第三個「手動跑正常、排程靜靜失敗」的坑（前兩個是 WAL 與 .env），
# 所以這裡自己把路徑找出來，不依賴排程環境。
AWS=""
for p in "$(command -v aws 2>/dev/null || true)" /snap/bin/aws /usr/local/bin/aws /usr/bin/aws; do
  if [ -n "$p" ] && [ -x "$p" ]; then AWS="$p"; break; fi
done

if [ -n "$BUCKET" ] && [ -n "$AWS" ]; then
  "$AWS" s3 cp "$OUT" "s3://$BUCKET/avalo-db/$STAMP.db.gz" --only-show-errors
  # 遠端只留最近 KEEP 份。資料庫快照跟照片不同——它是全量的，
  # 留一年份沒有意義，而且每一份都含全部客人的個資。
  "$AWS" s3 ls "s3://$BUCKET/avalo-db/" | sort | head -n -"$KEEP" | awk '{print $4}' | while read -r key; do
    [ -n "$key" ] && "$AWS" s3 rm "s3://$BUCKET/avalo-db/$key" --only-show-errors
  done
  echo "[$(date)] backup ok (local + s3): $STAMP → s3://$BUCKET/avalo-db/"
else
  echo "[$(date)] backup ok (local only): $STAMP  — 設 BACKUP_S3_BUCKET + IAM Role 可加離線備援"
fi
