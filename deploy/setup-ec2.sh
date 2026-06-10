#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Avalo — EC2 (Ubuntu 24.04) 一鍵初始化＋安全硬化
# 用法：以 ubuntu 使用者執行  sudo bash setup-ec2.sh yourdomain.com
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?用法: sudo bash setup-ec2.sh yourdomain.com}"
APP_DIR=/opt/avalo
APP_USER=avalo

echo "── [1/8] 系統更新與基本套件 ──"
apt-get update -y && apt-get upgrade -y
apt-get install -y nginx fail2ban unattended-upgrades ufw git curl sqlite3

echo "── [2/8] Node.js 22 LTS ──"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "── [3/8] 自動安全更新 ──"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "── [4/8] SSH 硬化（禁 root、禁密碼登入）──"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

echo "── [5/8] 防火牆 UFW（22/80/443）──"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "── [6/8] fail2ban（SSH 暴力破解防護）──"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
maxretry = 4
bantime = 1h
findtime = 10m
EOF
systemctl enable --now fail2ban

echo "── [7/8] swap 2G（小型機種防 OOM）──"
if ! swapon --show | grep -q swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "── [8/8] 應用程式使用者與目錄 ──"
id -u $APP_USER &>/dev/null || useradd -r -m -d $APP_DIR -s /usr/sbin/nologin $APP_USER
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# systemd 服務
cat > /etc/systemd/system/avalo.service <<EOF
[Unit]
Description=Avalo Next.js
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/app
EnvironmentFile=$APP_DIR/app/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
# 程序層隔離
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

# Nginx 站台（先 HTTP，certbot 之後升級 HTTPS）
cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/avalo
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/avalo
ln -sf /etc/nginx/sites-available/avalo /etc/nginx/sites-enabled/avalo
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "✅ 初始化完成。後續步驟見 DEPLOY.md："
echo "   1. 部署程式碼到 $APP_DIR/app 並 npm ci && npm run build"
echo "   2. systemctl enable --now avalo"
echo "   3. snap install --classic certbot && certbot --nginx -d $DOMAIN"
