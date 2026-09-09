#!/usr/bin/env bash
# 商品照片的離線備份。
#
# 為什麼需要單獨一支：backup-db.sh 只備 SQLite。照片放在 /var/www/avalo-uploads，
# 完全不在任何備份裡——EBS 掉了就是全部消失，而且**補不回來**：
# 那些商品早就採買、寄給客人了，不可能重拍。資料庫裡會留著一堆指向
# 不存在檔案的 DgImage 列，前台變成一整片破圖。
#
# crontab（avalo 使用者）：25 3 * * * /opt/avalo/app/deploy/backup-uploads.sh >> /opt/avalo/backup.log 2>&1
#
# ⚠ 刻意**不加 --delete**。
# 兩個理由：
#   ① sweepBatchFullImages 會在檔期結束 30 天後清掉本機的大圖（只留縮圖）。
#      加了 --delete，S3 上的大圖會跟著消失——但那正是最值得留的東西，
#      而且它很小：一檔約 28MB，一年不到 1.5GB。
#   ② --delete 是備份最經典的自傷：來源目錄哪天掛載失敗或被清空，
#      一次同步就把遠端的副本一起抹掉。備份只該累加。
set -euo pipefail

SRC=/var/www/avalo-uploads
ENV_FILE=/opt/avalo/app/.env

# ⚠ 一定要自己讀 .env。cron 不會載入它——
# 只靠 ${BACKUP_S3_BUCKET:-} 的話，Barry 在 .env 設好了也永遠不會生效，
# 而 log 會一直印「local only」，看起來像設定沒吃到，實際是根本沒讀。
# （2026-09-09 上線後查出來的，跟 WAL 那個是同一種「靜靜跳過」的錯。）
BUCKET="${BACKUP_S3_BUCKET:-}"
if [ -z "$BUCKET" ] && [ -r "$ENV_FILE" ]; then
  BUCKET=$(sed -n 's/^BACKUP_S3_BUCKET=//p' "$ENV_FILE" | tr -d '"'"'" | head -1)
fi

if [ -z "$BUCKET" ]; then
  echo "[$(date)] uploads backup SKIPPED: 未設定 BACKUP_S3_BUCKET" >&2
  exit 0
fi

# ⚠ 不要只靠 `command -v aws`。cron 的 PATH 只有 /usr/bin:/bin，
# 而 aws cli 是 snap 裝的，住在 /snap/bin——互動 shell 找得到、cron 找不到。
# 這是今天第三個「手動跑正常、排程靜靜失敗」的坑（前兩個是 WAL 與 .env），
# 所以這裡自己把路徑找出來，不依賴排程環境。
AWS=""
for p in "$(command -v aws 2>/dev/null || true)" /snap/bin/aws /usr/local/bin/aws /usr/bin/aws; do
  if [ -n "$p" ] && [ -x "$p" ]; then AWS="$p"; break; fi
done

if [ -z "$AWS" ]; then
  echo "[$(date)] uploads backup FAILED: 找不到 aws cli" >&2
  exit 1
fi

if [ ! -d "$SRC" ]; then
  echo "[$(date)] uploads backup FAILED: 找不到 $SRC" >&2
  exit 1
fi

# 空目錄也照跑（第一次部署、還沒有任何商品照時是正常的），
# 但要把數量印出來——「備份成功但 0 個檔案」必須看得出來。
COUNT=$(find "$SRC" -type f | wc -l)

"$AWS" s3 sync "$SRC" "s3://$BUCKET/uploads/" --only-show-errors

REMOTE=$("$AWS" s3 ls "s3://$BUCKET/uploads/" --recursive --summarize 2>/dev/null \
  | sed -n 's/^ *Total Objects: *//p' | head -1)

echo "[$(date)] uploads backup ok: 本機 $COUNT 個檔案 → s3://$BUCKET/uploads/（遠端 ${REMOTE:-?} 個）"
