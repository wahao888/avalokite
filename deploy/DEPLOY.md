# Avalo 部署手冊（AWS EC2）

## 0. 事前準備

| 項目 | 說明 |
|---|---|
| EC2 | Ubuntu 24.04 LTS，t3.small 以上（t3.micro 也可，已含 swap） |
| Security Group | Inbound 只開：`80`、`443`（0.0.0.0/0）、`22`（**限你的固定 IP**） |
| IAM Role | 掛到 EC2，含備份桶的 `s3:PutObject / ListBucket / DeleteObject` |
| 網域 | A record 指向 EC2 Elastic IP |
| 綠界帳號 | 正式 MerchantID / HashKey / HashIV（開發期用測試商店 2000132） |

## 1. 初始化主機（一次性）

```bash
scp -r deploy ubuntu@<EC2_IP>:/tmp/deploy
ssh ubuntu@<EC2_IP>
sudo bash /tmp/deploy/setup-ec2.sh yourdomain.com
```

腳本做了：系統更新、Node 22、UFW（22/80/443）、SSH 禁 root/密碼、fail2ban、
unattended-upgrades 自動安全更新、2G swap、`avalo` 服務使用者、systemd unit、Nginx 站台。

## 2. 部署程式碼

```bash
sudo -u avalo git clone <你的 repo> /opt/avalo/app   # 或 rsync 上傳
cd /opt/avalo/app
sudo -u avalo cp .env.example .env
sudo -u avalo nano .env    # ↓ 見「環境變數」
sudo -u avalo npm ci
sudo -u avalo npx prisma migrate deploy
sudo -u avalo npm run build
sudo systemctl enable --now avalo
curl -I http://127.0.0.1:3000   # 應回 200
```

### 環境變數（正式機 .env）

```ini
DATABASE_URL="file:./prod.db"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"   # 綠界回呼網址的基底，務必正確
ECPAY_MERCHANT_ID="<正式商店代號>"
ECPAY_HASH_KEY="<正式 HashKey>"
ECPAY_HASH_IV="<正式 HashIV>"
ECPAY_ENV="production"
ADMIN_PASSWORD="<強密碼：20 字以上隨機>"
ADMIN_SESSION_SECRET="<openssl rand -hex 32>"
SMTP_HOST="email-smtp.ap-northeast-1.amazonaws.com"  # AWS SES 或其他 SMTP
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
MAIL_FROM="Avalo <no-reply@yourdomain.com>"
MAIL_OWNER="<你自己的收件信箱>"
```

> 改完 .env 後 `sudo systemctl restart avalo`。

## 3. HTTPS（Let's Encrypt，自動續期）

```bash
sudo snap install --classic certbot
sudo certbot --nginx -d yourdomain.com
sudo certbot renew --dry-run
```

## 4. 綠界正式環境切換清單

1. 申請綠界「特約商店」：網站需已上線並含 **價格、聯絡方式、退款政策**（本站已內建 `/legal/refund` 等頁）。
2. 後台取得正式 MerchantID / HashKey / HashIV → 填入 `.env`，`ECPAY_ENV="production"`。
3. 綠界後台設定不需要填回呼網址（本站每筆交易動態帶入），但需確認：
   - 信用卡收單已開啟「定期定額」功能（需另外申請）。
4. 真卡小額測試一筆（可下單「網站健檢」NT$9,900）並退款驗證流程。
5. 停止某客戶訂閱扣款：綠界後台 → 信用卡收單 → 定期定額查詢 → 以 admin 後台顯示的授權單號（gwsr）終止授權。

## 5. 備份（每日 SQLite → S3）

```bash
sudo apt-get install -y awscli
sudo -u avalo crontab -e
# 加入（換成你的桶名）：
# BACKUP_S3_BUCKET=your-backup-bucket
# 15 3 * * * /opt/avalo/app/deploy/backup-db.sh >> /opt/avalo/backup.log 2>&1
```

還原：`aws s3 cp s3://bucket/avalo-db/<檔> . && gunzip … && mv 到 prisma/prod.db && systemctl restart avalo`

## 6. 日常維運

```bash
sudo systemctl status avalo        # 服務狀態
sudo journalctl -u avalo -f        # 即時 log（新訂單/詢問單 mail skipped 也會在這）
sudo fail2ban-client status sshd   # 被 ban 的 IP
```

更新版本——**在本機跑這一行就好**：

```bash
bash deploy/deploy.sh
```

它會依序做：本機測試 → `prisma generate` → 本機 `next build` → rsync（含建置產物）→
伺服器 [server-update.sh](server-update.sh)（備份資料庫 → 同步 → npm install → prisma
generate/migrate → 套用產物 → restart → 健康檢查）→ 線上頁面確認。全程約 30 秒。

**為什麼改成在本機 build**：t3.micro 只有 908MB RAM，伺服器端 build 得靠 swap 硬撐（歷史上
OOM 被砍的來源），而且慢很多——同一份改動，伺服器 build 要 2 分 20 秒，本機 build 只要 31 秒。
2026-07-30 實測本機 Node 25/macOS 建出的產物在伺服器 Node 22/Linux 上運作正常
（11 條路由、11 支 JS chunk、API POST 全數通過）。若 `.next` 沒送上去，
server-update.sh 會自動退回「在伺服器 build」的備援路徑，不會爆掉。

> ⚠️ 五個踩過的雷（[server-update.sh](server-update.sh) 已內建處理）：
> 1. **`prisma migrate deploy` 不會重生 client** —— 一定要先 `npx prisma generate`，否則新 schema 欄位型別對不上、`next build` 會失敗。
> 2. **build 步驟別接 `| tail`** —— 那會用 tail 的 exit code 蓋掉 build 的，導致 build 失敗仍繼續 restart、帶壞的 `.next` 上線。腳本用 `set -euo pipefail`。
> 3. **build 記憶體吃緊（t3.micro）** —— 腳本以 `NODE_OPTIONS=--max-old-space-size=1536` 讓 node 用 swap 當緩衝，避免被系統 OOM 直接砍掉。
> 4. **`rsync --delete` 會刪掉正式資料庫** —— 本機上傳時排除了 `prisma/*.db*`，所以 `/tmp/app/prisma/` 裡沒有 `prod.db`；伺服器端若不排除，`--delete` 就會把正式庫刪光，`migrate deploy` 再造一個空的，訂單／付款／訂閱全沒。腳本已加 `--exclude 'prisma/*.db*'` 系列，並在同步前先跑一次 [backup-db.sh](backup-db.sh)。2026-07-30 實際踩過一次（當時庫內只有機器人灌的垃圾資料，無實質損失）。
> 5. **`[ -f "$APP/.next/..." ]` 永遠判為假** —— `/opt/avalo/app` 屬於 avalo 使用者，
>    ubuntu 讀不到，所以判斷「有沒有本機送上來的產物」必須用 `sudo test -f`，
>    否則會靜靜地每次都退回伺服器 build（症狀：本機與伺服器的 `.next/BUILD_ID` 對不起來）。

## 監控與告警

| 排程（root crontab） | 做什麼 |
|---|---|
| `*/5 * * * *` [health-check.sh](health-check.sh) | 檢查網站是否活著、磁碟 <85%、憑證 >20 天。異常才寄信，同一項目 1 小時冷卻，恢復時也會通知 |
| `0 0 * * *` [daily-report.sh](daily-report.sh) | 台北時間早上 8 點寄每日簡報：流量、4xx/5xx、來源 IP Top5、熱門路徑、fail2ban 封鎖數、磁碟／記憶體／憑證／資料庫筆數／最近備份 |

寄信走 [notify.js](notify.js)（伺服器沒有 MTA，直接沿用 `.env` 那組 SMTP）。
**每日簡報同時是心跳**：整台機器掛掉時 health-check 也寄不出信，所以「某天沒收到簡報」本身就是警訊。
真正的外部監控（UptimeRobot 之類）仍建議另外接，才擋得住整台機器失聯的情況。

## 安全防護總覽

| 層 | 措施 |
|---|---|
| AWS | SG 只開 80/443/22(限源IP)、IAM Role 而非金鑰、EBS 快照 |
| 主機 | SSH 金鑰限定＋禁 root、fail2ban（4 個 jail，見 [fail2ban/](fail2ban/)）、unattended-upgrades、UFW、swap |
| Nginx | 速率限制（表單 6r/min、API 5r/s、頁面 10r/s，綠界回呼白名單）、單 IP 併發上限、掃描路徑 444、安全標頭＋CSP、隱藏版本 |
| 應用 | Zod 驗證所有輸入、價格以伺服器目錄為準、ECPay CheckMacValue 雙向驗章、admin HMAC session＋登入鎖定、systemd 沙箱（NoNewPrivileges/ProtectSystem） |
| 資料 | 卡號完全不經手（綠界頁面處理）、每日備份 S3 保留 30 份 |
