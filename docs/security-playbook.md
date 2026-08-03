# 網站部署安全手冊

> Avalo 內部通用手冊。整理自 avalokite.xyz（Next.js + systemd）與 damenkyt.com
> （React + Node + Docker Compose）兩站的實作與實際事故。
> 新站上線時當檢查清單用，每一項都附「怎麼驗證」——**沒驗證過的防護，等於沒有**。
>
> 最後更新：2026-08-03

---

## 0. 為什麼要有這份文件

2026-07-30，一台掃描器在 7 分鐘內對 avalokite.xyz 灌了 205 次表單、全站 8000+ 次請求。
2026-01，damenkyt.com 的伺服器被植入挖礦程式（攻擊者拿到 root）。

這兩件事都不是被針對，是網際網路的常態——任何公開 IP 每天都會被掃。
下面每一條規則背後都有一次實際的疼痛。

**最重要的一條原則：不要相信「設定好了」，要相信「測過了」。**
這份文件裡最有價值的部分是第 7 章「踩過的坑」——那些全都是「看起來正常但實際無效」的設定，
不去驗證永遠不會發現。

---

## 1. 上線前快速清單

抄這張表，逐項打勾。細節見後面章節。

| # | 項目 | 驗證指令 |
|---|---|---|
| 1 | 防火牆只開必要埠 | `sudo ufw status` |
| 2 | SSH 禁密碼、禁 root | `sudo sshd -T \| grep -E "^passwordauthentication\|^permitrootlogin"` |
| 3 | 應用程式只綁 127.0.0.1 | `sudo ss -tlnp \| grep -v 127.0.0.1` |
| 4 | 自動安全更新已啟用 | `systemctl is-active unattended-upgrades` |
| 5 | HTTPS 憑證與自動續期 | `sudo certbot certificates` / `systemctl list-timers \| grep certbot` |
| 6 | 安全標頭齊全 | `curl -sI https://<站> \| grep -iE "strict-transport\|x-frame\|content-security"` |
| 7 | 速率限制（三層） | 見 §3.2 的並發測試 |
| 8 | 掃描路徑被擋 | `curl -o /dev/null -w "%{http_code}" https://<站>/.env` → 應為 000 |
| 9 | fail2ban 規則**實際生效** | 見 §4.4 的實測法（**必做**） |
| 10 | 表單有 honeypot 與速率限制 | 連續送出應出現 429 |
| 11 | 通知信有流量上限 | 見 §5.3 |
| 12 | 資料庫不對外、有認證 | 見 §6 |
| 13 | 備份可運作且**還原過** | 見 §6.3 |
| 14 | 監控告警會真的寄出 | 手動觸發一次 |
| 15 | 部署流程不會刪資料庫 | 見 §7.1（**血淚**） |
| 16 | 重開機後全部自動回來 | 見 §7.9（**血淚**） |

---

## 2. 主機層

### 2.1 防火牆
只開 22 / 80 / 443。UFW 夠用。

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable
```

**遠端操作防鎖死**：啟用前先掛一個自動復原，確認沒鎖死自己再取消。

```bash
sudo nohup sh -c "sleep 180; ufw --force disable" >/dev/null 2>&1 &
sudo ufw --force enable
# ...驗證 SSH 與網站都正常...
sudo pkill -f "sleep 180"   # 注意：這個 pattern 可能誤殺自己的 ssh 指令，改用更精確的字串
```

**⚠️ Docker 主機兩個大坑**（見 §7.6、§7.7）：
- Docker 發布的埠**不受 ufw 管轄**，ufw 擋不住 `ports: - "5002:5000"`
- 啟用 ufw 前必須把 `/etc/default/ufw` 的 `DEFAULT_FORWARD_POLICY` 改成 `ACCEPT`，
  否則會切斷容器對外連線

### 2.2 SSH
```
PermitRootLogin no
PasswordAuthentication no
```
只用金鑰。定期檢查 `authorized_keys` 有沒有多出不認識的（入侵者常留後門金鑰）：

```bash
sudo ssh-keygen -lf /home/<user>/.ssh/authorized_keys   # 看指紋與註解
sudo zgrep -h "Accepted" /var/log/auth.log* | grep -oE "from [0-9.]+" | sort | uniq -c
```

**雲端防火牆的 22 埠建議限制來源 IP**，但若你的家用 IP 會變動，鎖死前先確認有救援途徑
（EC2 Instance Connect、Lightsail 主控台終端機）。

### 2.3 系統更新與重開機
```bash
systemctl is-active unattended-upgrades
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required
uname -r; ls -1 /boot/vmlinuz-* | sort -V | tail -1   # 執行中 vs 已安裝
```
自動更新只是下載安裝，**核心修補要重開機才生效**。長期不重開等於白裝。
但重開前務必先確認 §7.9 那一整套。

### 2.4 資源監控
磁碟滿了服務就掛。Docker 主機特別容易被映像檔與 build 快取塞爆。

```bash
df -h /
sudo docker system prune -f    # 不加 --volumes，不會動到資料
```
> 實例：damenkyt 的磁碟 87%，清完剩 43%（回收 18.4GB）。

---

## 3. Nginx 層

### 3.1 基本
```nginx
server_tokens off;              # 不洩漏版本號
client_max_body_size 10m;       # 依實際上傳需求，但不要無上限
http2 on;                       # nginx 1.25.1+ 用獨立指令；效能與連線數都受益

# 擋 slowloris
client_body_timeout 15s;
client_header_timeout 10s;
send_timeout 30s;
keepalive_timeout 30s;

# 只收實際會用到的方法
if ($request_method !~ ^(GET|HEAD|POST)$) { return 405; }
```

### 3.2 速率限制（分層）
一個全站通用的限制一定會出事：太鬆擋不住灌水，太緊誤傷正常使用者。

```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m     rate=5r/s;
limit_req_zone $binary_remote_addr zone=form:10m    rate=6r/m;   # 表單另外抓
limit_conn_zone $binary_remote_addr zone=conn:10m;

limit_req_status 429;    # 預設 503 會讓人以為網站掛了，也不利 fail2ban 判讀
limit_conn_status 429;
limit_conn conn 40;      # 太低會誤傷（見 §7.5）

location ~ ^/api/(contact|quote)$ { limit_req zone=form burst=5 nodelay; ... }
location /api/ { limit_req zone=api burst=20 nodelay; ... }
location /     { limit_req zone=general burst=60 nodelay; ... }
```

**驗證**：
```bash
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n" https://<站>/api/<端點> & done | sort | uniq -c
# 應該看到一部分 200、一部分 429
for i in $(seq 1 10); do curl -s -o /dev/null -w "%{http_code}\n" https://<站>/ & done | sort | uniq -c
# 一般頁面應全部 200，沒被誤擋
```

### 3.3 安全標頭
```nginx
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

**只在一個地方設**。應用程式框架（Next.js `next.config.ts` 的 headers()、Express 的 helmet）
和 nginx 都設會出現重複標頭。建議統一放 nginx——那是最外層，連 502 或 444 這種
應用程式沒參與的回應也蓋得到。

**⚠️ nginx 的 `add_header` 不會繼承**：某個 `location` 只要自己有 `add_header`，
就會失去 server 層的**全部**標頭。見 §7.4。

### 3.4 CSP
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://<金流網域>; frame-ancestors 'none'; upgrade-insecure-requests" always;
```

- **先用 `Content-Security-Policy-Report-Only` 上線**，用真實瀏覽器把所有頁面走一遍、
  看 console 有無違規，確認零違規再轉正式
- `form-action` 必須放行金流網域，否則付款導轉會被擋（先把程式碼裡所有可能的
  action URL 找出來核對）
- **Next.js 專案別用 nonce 版**：官方文件明講 nonce CSP 會強制所有頁面動態渲染，
  等於廢掉 SSG 與 CDN 快取。小機器撐不起

### 3.5 掃描路徑一律斷線
```nginx
location ~* ((^|/)(wp-admin|wp-login|xmlrpc\.php|phpmyadmin|\.env|\.git|\.svn|\.aws|\.DS_Store|vendor/|cgi-bin/|autodiscover|eval-stdin\.php|phpinfo|run_sql|aws/)|\.(php|ts)$|(keys|config|credentials|secrets)\.json$) {
    return 444;
}
```

要點：
- 用 `(^|/)` 而非 `^/`——否則 `/saas/.env`、`/config/.env` 這類巢狀路徑會穿過去
- `444` = 不回應直接關連線，比 404 省資源，也不餵資訊給掃描器
- **這條 location 是 fail2ban「一擊即封」的判斷依據**（見 §4.3），
  所以清單裡只能放絕不會撞到真實路由的樣式
- **⚠️ 加樣式前先核對真實路由**。特別注意：`/admin`、`/products` 可能是你的真實頁面；
  `manifest.json` 是 PWA 要用的，不能無差別擋 `.json`
- SPA 專案要特別加這條：`try_files $uri /index.html` 會讓所有未知路徑回 200，
  等於對掃描器來說「每個路徑都存在」

### 3.6 Host 與 SNI
多網域／多租戶架構下，要擋 Host 標頭亂送：

```nginx
server {                        # 預設站台
    listen 80 default_server;
    server_name _;
    access_log /var/log/nginx/rejected.log;   # 見下方註記
    return 444;
}
server {
    listen 443 ssl default_server;
    server_name _;
    ssl_reject_handshake on;    # nginx 1.19.4+，不需憑證直接在 TLS 階段拒絕
}
```

> **註記**：如果你用「出現 444 就封鎖」當 fail2ban 規則，這個 default_server 的 444
> 必須寫到**另一個 log 檔**。Host 亂送跟探測 `.env` 是不同性質，混在一起會誤判。

---

## 4. 自動封鎖（fail2ban）

### 4.1 分層策略
| jail | 觸發條件 | 封鎖 |
|---|---|---|
| `sshd` | SSH 暴力破解 | 1 小時 |
| `honeypath` | 出現 444（探測 `.env` 等） | **1 次即封**，24 小時 |
| `scan` | 短時間大量 4xx | 5 分鐘 40–60 次，6 小時 |
| `auth` | 後台登入失敗 | 10 分鐘 5 次，1 小時 |
| `nginx-limit-req` | 持續觸發限流 | 門檻要放寬（見 §7.5） |

**網頁層的 jail 只封 http/https，不要封 22**：

```ini
action = iptables-multiport[name=<jail>, port="http,https"]
```
誤觸時網站進不去但 SSH 還在，救得回來。

### 4.2 一擊即封的邏輯
探測 `.env`、`wp-admin`、`.git` 這類路徑，**沒有任何正常瀏覽器或搜尋引擎會產生**，
誤判率實質為零，所以 `maxretry = 1`。

而「5 分鐘 N 次 4xx」這種累積型規則很容易被繞過——實測看過攻擊者每個 IP 只打
30–42 次就換人，剛好卡在門檻下。**一擊即封才是對付分散式掃描的有效手段。**

```ini
[honeypath]
enabled  = true
filter   = honeypath
logpath  = /var/log/nginx/access.log
backend  = polling          # ← 非常重要，見 §7.2
maxretry = 1
findtime = 1d
bantime  = 1d
```
filter：
```ini
failregex = ^<HOST> -[^"]*"[A-Z]+ [^"]*" 444 \d+
```

### 4.3 登入失敗要另外處理
許多框架的登入失敗是 **303 導轉**，跟成功長得一模一樣，也不算 4xx——
**暴力破解在 access log 與「4xx 統計」裡完全隱形**。

做法：讓應用程式自己印一行，fail2ban 讀 journal。

```js
console.warn(`[auth fail] admin ip=${ip}`);
```
```ini
[auth]
backend  = systemd
filter   = auth            # failregex = \[auth fail\] \S+ ip=<HOST>
maxretry = 5
findtime = 10m
```
這層同時補掉「應用層鎖定計數器存在行程記憶體、每次部署就歸零」的破口。

### 4.4 ⚠️ 一定要實測封鎖是否真的生效

`fail2ban-client status` 顯示「已封鎖」**不代表對方真的進不來**。至少踩過三種假象
（§7.2、§7.3、§7.8）。唯一可信的驗證是**自己觸發、確認真的連不上、再解封**：

```bash
curl -o /dev/null -w "%{http_code}" https://<站>/.env      # 觸發
sudo fail2ban-client status <jail>                          # 應看到自己的 IP
sudo iptables -n -L f2b-<jail>                              # 應看到 DROP 規則
curl -o /dev/null -w "%{http_code}" https://<站>/           # 應為 000（真的被擋）
sudo fail2ban-client set <jail> unbanip <你的IP>            # 解封
```

**第四步才是重點**。前三步都正常但第四步照樣回 200 的情況，實際遇過。

---

## 5. 應用層

### 5.1 輸入與表單
- 所有輸入用 schema 驗證（Zod / Joi），不信任任何欄位
- 價格、金額一律以伺服器端目錄為準，不吃前端傳來的數字
- **表單三道防線**：honeypot 隱藏欄位（機器人填了就靜默丟棄，回假成功）
  ＋ 每 IP 速率限制（10 分鐘 5 次）＋ nginx 層限流
- 金流回呼要雙向驗章

honeypot 範例：
```html
<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">
  <label>請勿填寫<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
</div>
```
```js
if (data.website) return NextResponse.json({ ok: true });  // 假裝成功，不落庫不寄信
```

### 5.2 認證與 session
- 密碼比對用 `crypto.timingSafeEqual`，不要用 `===`
- 密碼長度 ≥ 20 字元隨機。**20 字元英數約 119 bits 熵，網路暴力破解在數學上不可能**
  （以 5 req/s 計算需要遠超宇宙年齡）。密碼強度通常不是弱點，**偵測與可見度才是**
- cookie：`httpOnly` + `secure` + `sameSite: strict`（後台）
- 每 IP 失敗鎖定，但要知道它存在行程記憶體、部署即歸零——持久層交給 fail2ban

### 5.3 通知信要有流量閘
表單被灌 205 次 = 收到 205 封信。信箱爆掉之外，真正的通知也被淹沒。

```js
const MAX_PER_HOUR = 30;
// 超過就停寄，只在「剛跨過門檻」時補一封告警信，告訴自己怎麼查來源 IP
// 資料仍正常寫入資料庫，不會遺失
```
多租戶要**依租戶分艙**，否則一家客戶被灌爆會讓其他客戶收不到通知。

### 5.4 不要外洩內部結構
- 移除宣告了但根本沒用到的套件——它們只帶來漏洞，不帶來功能
  （實例：`request@2.88.2` 已停止維護，一個套件帶兩個 critical；
  `jspdf` 後端從未引用。移除即歸零，零風險）
- 定期 `npm audit --omit=dev`，優先處理**會處理外部輸入**的套件
  （影像處理、檔案解析、序列化）——那是 RCE 的高危區

---

## 6. 資料層

### 6.1 資料庫不對外
- 自架：綁 127.0.0.1 或只在內網，**一定要設帳密**
- 雲端（Atlas 等）：**IP 允許清單絕不能是 `0.0.0.0/0`**

**不需帳密就能自我檢查 Atlas 是否對外開放**：
```bash
dig +short _mongodb._tcp.<叢集>.mongodb.net SRV
nc -z <取得的節點> 27017     # 連得上 = 白名單含 0.0.0.0/0
```
Atlas 的白名單是網路層阻擋，能握手就代表沒擋。

> 實例：damenkyt 的 Atlas 開放給全世界，唯一防線只有連線字串裡的帳密。
> 而那台機器曾被取得 root——攻擊者若讀走 `.env` 就等於拿到資料庫。

### 6.2 沒用到的服務直接移除
幫一個沒人用的資料庫加密碼是白工。先確認「有沒有人在用」再決定怎麼處理。

> 實例：damenkyt 跑著一個 MongoDB 容器，沒有認證、吃 167MB 記憶體，
> 但所有服務其實都連雲端 Atlas，那個容器裡只有 2 筆系統文件。移除，不是加固。

### 6.3 備份
- 每日快照、輪替保留（30 份）
- **部署前自動備份一次**
- 離線備援（S3 等）——本機備份防誤刪，但防不了整顆磁碟掉
- **定期真的還原一次**。沒還原過的備份不算備份

---

## 7. 踩過的坑（本文最重要的一章）

以下每一條都是「看起來正常、實際無效或會出事」的設定。

### 7.1 rsync `--delete` 刪掉正式資料庫
本機上傳時排除了 `prisma/*.db*`，所以暫存區沒有資料庫檔；伺服器端的
`rsync -a --delete` 若不排除，就會把正式資料庫刪光，migration 再造一個空的。
**訂單、付款、訂閱全沒。**

→ 伺服器端的 rsync 也要 `--exclude 'prisma/*.db*'`，並在同步前自動備份。
→ 驗證法：塞一筆哨兵資料，部署後確認它還在。

### 7.2 fail2ban 的 `logpath` 被無聲忽略
Ubuntu 的 fail2ban 預設 `backend = systemd`（讀 journal）。
**不明寫 `backend = polling` 的話，`logpath` 完全不生效**，jail 看起來啟用中、
規則也正確（`fail2ban-regex` 測得到），但永遠抓不到任何東西。

→ 症狀辨識：`fail2ban-client status <jail>` 顯示 `Journal matches:` 而非 `File list:`。
→ 用 `polling` 而非 `auto`：日誌若用 copytruncate 輪替，inotify 對「就地清空」不可靠。

### 7.3 Docker 環境的封鎖規則要寫進 `DOCKER-USER`
Docker 發布埠的流量走 FORWARD/DOCKER 鏈，**不經過 INPUT**。
fail2ban 內建的 iptables 動作插進 INPUT，對容器**完全無效**——
會顯示「已封鎖」但對方照樣打得進來。

→ 自訂 action 寫進 `DOCKER-USER`（Docker 官方保留給使用者、且排在自己規則之前的鏈）。
→ 主機服務（sshd）不受此限，用內建動作即可。

### 7.4 nginx `add_header` 不繼承
某個 `location` 只要有自己的 `add_header`，就會**失去 server 層的全部標頭**。
常見於為靜態資源加 `Cache-Control` 的 location——結果那些回應完全沒有安全標頭。

→ 檢查：`curl -sI https://<站>/_next/static/xxx.js | grep -ic x-content-type-options`

### 7.5 限流門檻誤傷真人
現代前端（Next.js 的 `_rsc` 預抓）開一頁會一次送出數十個請求。
`burst=20` 會把正常使用者打成 429，再被 fail2ban 誤判成攻擊。

> 實例：站長自己瀏覽後台，一分鐘 71 個請求中 13 個被限流。
> 而 fail2ban 門檻是「5 分鐘 10 次」——下次同樣操作會被自己的網站封鎖一小時。

→ `burst` 放到 60、fail2ban `maxretry` 放到 30，掃描器交給一擊即封的 jail 處理。
→ 開 HTTP/2 也有幫助（一條連線多工，取代 HTTP/1.1 的每站 6 條）。

### 7.6 Docker 的埠不受 ufw 管
`ports: - "5002:5000"` 等於綁 `0.0.0.0`，ufw 擋不住它。
→ **改綁定位址**：`- "127.0.0.1:5002:5000"`。這才是有效做法。

### 7.7 ufw 會切斷容器對外連線
啟用 ufw 前必須把 `/etc/default/ufw` 的 `DEFAULT_FORWARD_POLICY` 改成 `ACCEPT`，
否則容器連不到外網（連不上雲端資料庫 = 整站掛）。

### 7.8 fail2ban 必須在 docker 之後啟動
Docker 啟動時會**重建 `DOCKER-USER` 鏈**，把 fail2ban 已插入的規則洗掉。
預設啟動順序中 fail2ban 比 docker 早，重開機後封鎖就完全失效——
而 `fail2ban-client status` 一切正常，只有看 iptables 才會發現。

→ systemd drop-in：`/etc/systemd/system/fail2ban.service.d/after-docker.conf`
```ini
[Unit]
After=docker.service
Requires=docker.service
```

### 7.9 重開機是最好的體檢，也最容易翻車
必須在重開**之前**確認的事：

1. **主機的 nginx/apache 會不會搶走 80/443**？容器化部署時，主機那份套件若被啟用，
   開機時會先佔埠讓容器起不來。→ `sudo systemctl mask nginx`（比 disable 更徹底，
   連被當作相依都無法啟動）
2. **docker、fail2ban、ufw 是否 `enabled`**？`systemctl is-enabled <服務>`
3. **compose 執行檔與 Docker 引擎版本是否相容**？
   > 實例：套件更新把 Docker 升到 29.1.3（最低 API 1.44），但獨立版
   > `docker-compose` 還停在 v2.20.2（API 1.43）。重開機後整站起不來，
   > 錯誤是 `client version 1.43 is too old`。這顆地雷埋很久，
   > 只是要等重開機才引爆。→ 平時就該定期確認 `docker-compose version`
   > 與 `docker version` 的相容性
4. 重開後逐項複驗：容器、ufw、fail2ban（**含 iptables 實際規則**）、網站、API

### 7.10 建置期環境變數會被烤進產物
`NEXT_PUBLIC_*` 這類變數在 **build 當下**就被編進 bundle 與預先產生的頁面。
改成本機 build 之後，本機 `.env` 的開發值（`http://localhost:3000`）會被帶上正式站。

> 實例：上線的 `sitemap.xml` 整份都是 localhost 網址，而且不會報錯，只會靜靜上線。

→ 部署腳本在 build 前先向伺服器取回正式值並 export，取不到就中止部署。

### 7.11 權限造成的無聲分支
`/opt/<app>` 屬於服務帳號時，一般使用者的 `[ -f "$APP/..." ]` 會**永遠判為假**。
判斷式靜靜走錯分支，症狀很難察覺。

> 實例：部署腳本判斷「有沒有本機送上來的建置產物」，因為讀不到而每次都退回
> 伺服器 build。要用 `sudo test -f`。
> 辨識法：比對本機與伺服器的 `.next/BUILD_ID` 是否一致。

### 7.12 容器日誌的輪替要用 `copytruncate`
一般 logrotate 會在輪替後送 USR1 讓程式重開檔案，但**那個訊號送不進容器**，
nginx 會繼續寫入已被改名的舊檔，fail2ban 監看的檔案就再也不會更新。

→ 用 `copytruncate`（複製後就地清空，不需通知寫入端）。
→ 另開獨立目錄（如 `/var/log/nginx-docker`），不要跟主機那套 logrotate 混用。

### 7.13 建置不可重現
`package-lock.json` 若被 gitignore，每次 build 都重新解析版本——
同樣的程式碼在不同時間 build 可能裝到不同版本。出事時難以回溯。

→ 鎖檔應該進版控。

---

## 8. 監控與告警

### 8.1 兩種東西不要混為一談
- **告警**：出事時**立刻**通知（網站掛了、磁碟滿了、憑證快到期）
- **簡報**：定期回顧趨勢

只有簡報等於沒有告警——週報要等到下週一才會告訴你網站週三就掛了。

### 8.2 告警要有冷卻與恢復通知
```
每 5 分鐘檢查：存活 / 磁碟 <85% / 憑證 >20 天
異常才寄信，同一項目 1 小時冷卻（避免一直掛就一直寄）
恢復時也通知一次
```

### 8.3 簡報同時是心跳
整台機器掛掉時，跑在上面的告警腳本也寄不出信。
**「今天沒收到簡報」本身就是警訊**——這一點要寫進信裡提醒自己。

真正的外部監控（UptimeRobot 之類）仍建議另外接。

### 8.4 ⚠️ 報表本身會騙人
這是最容易被忽略的一點。實際踩過三次：

1. **「來源 IP Top 5」把爬蟲排在最前面** ——看起來像攻擊者，其實是 Googlebot
   在拿 200。照著封會傷 SEO。
   → 拆成「正常流量 Top 5（2xx/3xx）」與「產生 4xx Top 5」兩份

2. **機器人判定只看 User-Agent** ——掃描器一律偽裝成正常瀏覽器，於是
   `/api/phpinfo/`、`/api/keys.json`、`/api/v0/run_sql` 全被算成「真人請求」，
   報表寫「真人 12、機器人 0」。
   → **改用路徑判定優先**：UA 可以偽裝，但「它在要什麼」騙不了人

3. **「功能使用」把探測算成功能** ——連程式碼裡根本不存在、回 404 的端點都被
   算了 7 次，看起來像有人在用功能。
   → 只統計「非機器人且非 4xx/5xx」的請求，探測另闢區塊獨立列出

> 逐一把探測路徑列黑名單追不完，**「這個請求成功了嗎」才是穩定的判準**。

### 8.5 隱形的失敗
登入失敗回 303、限流回 503——這些都會讓報表數字失真或讓攻擊隱形。
→ 限流改回 429（歸在 4xx，語意也正確），登入失敗另外記錄（見 §4.3）。

---

## 9. 部署流程本身

- **一鍵腳本**，不要手打指令。手打就會有一天漏掉某個步驟
- 流程內含：測試 → build → 上傳 → **備份資料庫** → 套用 → 重啟 → **線上健康檢查**
- 任何一步失敗就中止（`set -euo pipefail`），不要帶著壞的產物繼續
- 不要用 `| tail` 接在 build 後面——那會用 `tail` 的 exit code 蓋掉 build 的
- 小機器（1–2GB RAM）建議**本機 build 再上傳產物**：避免 OOM，也快很多
  （實測 2 分 20 秒 → 31 秒）。但要注意 §7.10 的環境變數問題
- 設定檔（nginx.conf、fail2ban 規則、systemd unit）**全部進版控**，
  重建機器時能直接套用

---

## 10. 還可以再優化的方向

依投資報酬率排序：

1. **CDN（Cloudflare 免費方案就夠）** — 藏起 origin IP（攻擊者就打不到你的伺服器）、
   吸收攻擊流量、提供 WAF 與 bot 防護，順帶大幅改善 TTFB。
   ⚠️ 上 CDN 前先確認 HTML 的 `Cache-Control` 不是超長的 `s-maxage`，
   否則改價、改文案後邊緣節點會發舊內容很久
2. **離線備份** — 本機備份防誤刪，防不了整顆磁碟掉
3. **外部可用性監控** — 機器整台失聯時，跑在上面的告警腳本也死了
4. **依賴升級排程** — 特別是處理外部輸入的套件（影像、解析、序列化）
5. **雲端防火牆的 22 埠限制來源 IP** — 但先確認有救援途徑
6. **二階段驗證** — 等系統開始承載真實金流與個資後再評估
7. **金流／認證路徑的測試覆蓋** — 這類邏輯出錯的代價最高，卻常常最缺測試

---

## 附錄：新機器快速健檢

```bash
# 主機
sudo ufw status
sudo sshd -T | grep -E "^permitrootlogin|^passwordauthentication"
systemctl is-active unattended-upgrades
sudo ss -tlnp | grep -v "127.0.0.1\|::1"        # 對外監聽的埠
df -h /
[ -f /var/run/reboot-required ] && echo "需要重開機"

# 開機自動啟動
for s in docker fail2ban ufw nginx; do printf "%-12s " $s; systemctl is-enabled $s 2>&1; done

# 網頁層
curl -sI https://<站>/ | grep -iE "strict-transport|x-frame|x-content-type|content-security|^server:"
curl -s -o /dev/null -w "%{http_code}\n" https://<站>/.env          # 期望 000
curl -sI https://<站>/ -o /dev/null -w "%{http_version}\n"          # 期望 2

# fail2ban（含實際規則，不能只看 status）
sudo fail2ban-client status
sudo iptables -n -L DOCKER-USER 2>/dev/null | grep f2b              # Docker 環境
sudo iptables -n -L INPUT | grep f2b                                # 一般環境

# 找攻擊來源
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
sudo awk '$9 ~ /^4/ {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
```
