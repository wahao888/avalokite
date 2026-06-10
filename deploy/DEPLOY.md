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

更新版本：`git pull && npm ci && npx prisma migrate deploy && npm run build && sudo systemctl restart avalo`

## 安全防護總覽

| 層 | 措施 |
|---|---|
| AWS | SG 只開 80/443/22(限源IP)、IAM Role 而非金鑰、EBS 快照 |
| 主機 | SSH 金鑰限定＋禁 root、fail2ban、unattended-upgrades、UFW、swap |
| Nginx | 速率限制（API 5r/s、頁面 10r/s，綠界回呼白名單）、安全標頭、隱藏版本 |
| 應用 | Zod 驗證所有輸入、價格以伺服器目錄為準、ECPay CheckMacValue 雙向驗章、admin HMAC session＋登入鎖定、systemd 沙箱（NoNewPrivileges/ProtectSystem） |
| 資料 | 卡號完全不經手（綠界頁面處理）、每日備份 S3 保留 30 份 |
