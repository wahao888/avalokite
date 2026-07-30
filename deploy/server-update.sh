#!/usr/bin/env bash
# Avalo 伺服器更新腳本（於 EC2 執行）。
# 前置：本機先 rsync 程式碼到伺服器 /tmp/app/（排除 node_modules .next .git .env *.pem .claude prisma/*.db* suminagashi）。
# 執行：ssh 進伺服器後 `bash /tmp/app/deploy/server-update.sh`（由 /tmp 執行，避免同步時覆蓋自身）。
#
# 這支腳本修正了三個部署雷：
#   1. `prisma migrate deploy` 不會重生 client → 這裡一定跑 `prisma generate`，否則新欄位型別對不上、build 失敗。
#   2. `set -o pipefail` + 不用 `| tail` 吃掉 build 的 exit code → build 失敗立即中止，不會帶著壞的 .next 去 restart。
#   3. 限制 build heap，讓 node 用 swap 當緩衝而非直接被系統 OOM（t3.micro 記憶體吃緊）。
#   4. rsync --delete 必須排除 prisma/*.db* —— 本機那份 rsync 不會上傳資料庫，所以 /tmp/app/prisma/
#      沒有 prod.db，--delete 會把伺服器上的正式資料庫整個刪掉（migrate deploy 再建一個空的，
#      訂單／付款／訂閱全部消失）。2026-07-30 實際發生過一次。
set -euo pipefail

APP=/opt/avalo/app

echo "=== 0/5 部署前先備份資料庫 ==="
sudo -u avalo bash -lc "$APP/deploy/backup-db.sh" || echo "（備份略過：資料庫尚未存在）"

echo "=== 1/5 同步程式碼（保留 node_modules/.next/.env/資料庫）==="
sudo rsync -a --delete --exclude node_modules --exclude .next --exclude .env \
  --exclude 'prisma/*.db' --exclude 'prisma/*.db-journal' --exclude 'prisma/*.db-wal' \
  --exclude 'prisma/*.db-shm' /tmp/app/ "$APP"/
sudo chown -R avalo:avalo "$APP"

echo "=== 2/5 安裝相依 ==="
sudo -u avalo bash -lc "cd $APP && npm install"

echo "=== 3/5 Prisma（generate 必跑，再 migrate deploy）==="
sudo -u avalo bash -lc "cd $APP && npx prisma generate"
sudo -u avalo bash -lc "cd $APP && npx prisma migrate deploy"

echo "=== 4/5 build（限制 heap 避免 OOM）==="
sudo -u avalo bash -lc "cd $APP && NODE_OPTIONS=--max-old-space-size=1536 npm run build"

echo "=== 5/5 重啟並健康檢查 ==="
sudo systemctl restart avalo
sleep 4
systemctl is-active avalo
curl -fsS -o /dev/null -w "health http://127.0.0.1:3000 -> %{http_code}\n" http://127.0.0.1:3000/zh-TW
echo "✓ 部署完成"
