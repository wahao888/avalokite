#!/usr/bin/env bash
# Avalo 一鍵部署（在「本機」執行，不是伺服器）。
#
#   bash deploy/deploy.sh
#
# 流程：本機 build → rsync（含建置產物）→ 伺服器跑 server-update.sh → 健康檢查。
# 為什麼在本機 build：t3.micro 只有 908MB RAM，伺服器端 build 得靠 swap 硬撐，
# 是歷史上 OOM 被砍的來源；本機 build 也讓部署快很多。
# 實測（2026-07-30）本機 Node 25/macOS 建出的產物在伺服器 Node 22/Linux 上運作正常。
set -euo pipefail

HOST=${AVALO_HOST:-ubuntu@13.209.138.204}
KEY=${AVALO_KEY:-avalo-studio.pem}
SITE=${AVALO_SITE:-https://avalokite.xyz}

cd "$(dirname "$0")/.."

echo "=== 1/4 本機測試 ==="
npx vitest run

echo "=== 2/4 本機 build ==="
# NEXT_PUBLIC_* 會在 build 時被「編進」前端 bundle 與預先產生的頁面，
# 所以必須用伺服器那份的值，不能用本機的——本機 .env 是開發用的
# （NEXT_PUBLIC_SITE_URL=http://localhost:3000），直接 build 會把 localhost
# 烤進 sitemap.xml、robots.txt 與各頁的 canonical。2026-08-03 實際踩過。
#
# 直接向伺服器拿，而不是在 repo 另存一份：兩份就會有一份過期，
# 伺服器的 .env 是唯一真實來源。
echo "  取用伺服器的 NEXT_PUBLIC_* 設定…"
PUBLIC_ENV=$(ssh -i "$KEY" "$HOST" 'sudo grep -E "^NEXT_PUBLIC_" /opt/avalo/app/.env' || true)
if [ -z "$PUBLIC_ENV" ]; then
  echo "  ⚠ 取不到伺服器的 NEXT_PUBLIC_*，中止以免把本機的值烤進正式站" >&2
  exit 1
fi
while IFS= read -r line; do
  [ -z "$line" ] && continue
  key=${line%%=*}
  val=${line#*=}
  val=${val%\"}; val=${val#\"}   # 去掉 .env 常見的引號
  export "$key=$val"
  echo "    $key=$val"
done <<< "$PUBLIC_ENV"

# schema 改過的話，generate 必須先跑，否則型別對不上（見 DEPLOY.md 的雷 ①）
npx prisma generate >/dev/null
npm run build

if [ ! -f .next/BUILD_ID ]; then
  echo "build 沒有產出 .next/BUILD_ID，中止" >&2
  exit 1
fi
echo "BUILD_ID = $(cat .next/BUILD_ID)"

echo "=== 3/4 上傳（含建置產物，排除 dev 快取）==="
# .next/dev 是 dev 模式的 turbopack 快取，體積可達數百 MB，絕不能傳
rsync -az --delete -e "ssh -i $KEY" \
  --exclude node_modules --exclude .git --exclude .env \
  --exclude '*.pem' --exclude .claude --exclude 'prisma/*.db*' --exclude suminagashi \
  --exclude '.next/dev' --exclude '.next/cache' \
  ./ "$HOST":/tmp/app/

echo "=== 4/4 伺服器套用 ==="
ssh -i "$KEY" "$HOST" 'bash /tmp/app/deploy/server-update.sh'

echo "=== 線上確認 ==="
for p in / /en /wenshan /cart /admin; do
  printf "  %-12s -> %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$SITE$p")"
done
echo "✓ 部署完成"
