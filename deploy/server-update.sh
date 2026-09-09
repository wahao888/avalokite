#!/usr/bin/env bash
# Avalo 伺服器更新腳本（於 EC2 執行）。
# 平常不必手動跑這支——在本機跑 `bash deploy/deploy.sh` 會自動走完整個流程。
# 前置：本機先 build 並 rsync 到伺服器 /tmp/app/（含 .next，但排除 .next/dev 與 .next/cache）。
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

# ⚠ 下面第 3 步會**停掉服務**才跑 migrate。set -e 之下，停掉之後到重啟之前
# 任何一步失敗都會讓站台留在關閉狀態——四個客戶站一起掛掉，而且沒人會知道。
# 這個 trap 保證不論怎麼中止，服務一定會被拉回來。
restore_service() {
  if ! systemctl is-active --quiet avalo; then
    echo "  ⚠ 部署中止，把服務拉回來（可能是舊版本，請檢查）" >&2
    sudo systemctl start avalo || true
  fi
}
trap restore_service EXIT

echo "=== 0/5 部署前先備份資料庫 ==="
sudo -u avalo bash -lc "$APP/deploy/backup-db.sh" || echo "（備份略過：資料庫尚未存在）"

echo "=== 1/5 同步程式碼與建置產物（保留 node_modules/.env/資料庫）==="
# .next 不再排除：本機已經 build 好一起送上來（見 deploy.sh）。
# .next/cache 排除，那是 build 快取，不需要也不該覆蓋伺服器上的。
# ⚠ /node_modules 的開頭斜線不可省（見 deploy.sh 的說明）：沒有它，
# .next/node_modules 也會被排除，而 sharp 的 turbopack 墊片就放在那裡。
sudo rsync -a --delete --exclude /node_modules --exclude .env --exclude '.next/cache' \
  --exclude 'prisma/*.db' --exclude 'prisma/*.db-journal' --exclude 'prisma/*.db-wal' \
  --exclude 'prisma/*.db-shm' /tmp/app/ "$APP"/
sudo chown -R avalo:avalo "$APP"

echo "=== 2/5 安裝相依 ==="
sudo -u avalo bash -lc "cd $APP && npm install"

# 上傳目錄與 SQLite 的 WAL。兩者都是冪等的，每次部署跑一次最省事。
#
# 上傳目錄：在 repo 樹之外，所以上面那個 rsync --delete 碰不到它；
# 也在 /opt/avalo 之外——那個目錄是 750 avalo:avalo，nginx（www-data）
# 穿不進去，圖片會全部回 403（見 setup-ec2.sh 的說明）。
# 這裡只是確保新機器或還沒跑過 setup-ec2.sh 的環境也有這個目錄。
sudo mkdir -p /var/www/avalo-uploads
sudo chown -R avalo:avalo /var/www/avalo-uploads

# WAL：連線尖峰時（LINE 群組一發商品，幾百人同一分鐘衝進來）
# 預設的 journal 模式會讓一筆寫入擋住所有讀取，客人看到的是頁面卡住。
# journal_mode 寫在資料庫檔頭、設一次永久有效，所以這行是冪等的。
# ⚠ 不能放進 Prisma migration：Prisma 用交易包住 migration，
#   而 PRAGMA journal_mode=WAL 不能在交易內執行。
# ⚠ 用 sudo test，不要用 [ -f ]（同下面第 4 步的理由）。
# $APP 在 /opt/avalo 底下，而那是 750 avalo:avalo——這支腳本以 ubuntu 執行，
# 連 stat 都做不到，[ -f ] 會**永遠判為不存在**，整個 if 靜靜跳過、
# 一行訊息都不會印。2026-09-08 上線後查出來：WAL 從來沒有被啟用過，
# 而它正是「LINE 群組一發商品、幾百人同時湧入」時避免寫入擋住讀取的東西。
if sudo test -f "$APP/prisma/prod.db"; then
  mode=$(sudo -u avalo sqlite3 "$APP/prisma/prod.db" "PRAGMA journal_mode=WAL;" 2>/dev/null || echo "")
  if [ "$mode" = "wal" ]; then
    echo "  WAL 已啟用"
  else
    # 印出實際拿到的值，不要再吞掉失敗——這正是上次沒被發現的原因
    echo "  ⚠ WAL 設定失敗（journal_mode=${mode:-未知}），請手動確認" >&2
  fi
fi

echo "=== 3/5 Prisma（generate 必跑，再 migrate deploy）==="
# generate 只讀 schema 檔、不碰資料庫，放在停機之前跑可以縮短中斷時間
sudo -u avalo bash -lc "cd $APP && npx prisma generate"

# ⚠ migrate deploy 一定要在服務停止的狀態下跑。
# 2026-09-09 啟用 WAL 之後的第一次部署就踩到：schema engine 需要排他鎖
# 才能初始化 _prisma_migrations，而跑著的 Next.js 握著連線池 →
# "SQLite database error: database is locked"，整個部署中止。
# 那個中止很難察覺：站台還活著（舊程序還在跑），但程式碼已經同步過去、
# 沒有重啟——磁碟上是新版、記憶體裡是舊版。
#
# 順帶好處：不會再出現「舊程式碼配上新 schema」的時間窗。
# 代價是多幾秒中斷，換的是部署的確定性，划算。
sudo systemctl stop avalo
sudo -u avalo bash -lc "cd $APP && npx prisma migrate deploy"

echo "=== 4/5 建置產物 ==="
# 注意用 sudo test：$APP 屬於 avalo 使用者，ubuntu 讀不到，直接用 [ -f ] 會永遠判為不存在
if sudo test -f "$APP/.next/BUILD_ID" && sudo test -d "$APP/.next/server"; then
  echo "使用本機送上來的產物（BUILD_ID=$(sudo cat "$APP/.next/BUILD_ID")）"
else
  # 備援路徑：本機忘了 build 或只 rsync 了原始碼時，仍能在伺服器上建
  echo "找不到建置產物 → 改在伺服器 build（限制 heap 避免 OOM）"
  sudo -u avalo bash -lc "cd $APP && NODE_OPTIONS=--max-old-space-size=1536 npm run build"
fi

echo "=== 5/5 重啟並健康檢查 ==="
sudo systemctl restart avalo
sleep 4
systemctl is-active avalo
curl -fsS -o /dev/null -w "health http://127.0.0.1:3000 -> %{http_code}\n" http://127.0.0.1:3000/zh-TW
echo "✓ 部署完成"
