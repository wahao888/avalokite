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
SUSPENDED_TENANTS=""                            # 欠費暫停中的客戶站 slug，逗號分隔；平常留空

# ── 代購站（amber）專用 ──
MEMBER_SESSION_SECRET="<openssl rand -hex 32>"  # 會員 session 的 HMAC 金鑰
UPLOAD_DIR="/var/www/avalo-uploads"                 # 商品照存放處，必須在 repo 樹之外
NEXT_PUBLIC_MEDIA_BASE="/u"                     # 對外圖片網址前綴，由 nginx 直送
LINE_CHANNEL_ID=""                              # 留空 = 前台不顯示 LINE 登入
LINE_CHANNEL_SECRET=""
```

> 改完 .env 後 `sudo systemctl restart avalo`。

**`MEMBER_SESSION_SECRET` 必須與 `PORTAL_SESSION_SECRET`／`ADMIN_SESSION_SECRET` 不同。**
三套身分刻意用三把金鑰：一個外洩的會員 token 不該有機會換成後台身分。

**`NEXT_PUBLIC_MEDIA_BASE` 是 `NEXT_PUBLIC_`，會在 build 當下被烤進 bundle**
（deploy.sh 已經會在 build 前把伺服器那份 .env 的值抓回來，見 §2 的踩雷紀錄）。
它必須是 `NEXT_PUBLIC_` 而不是普通環境變數，因為購物車抽屜與購物車頁是
客戶端元件、也要組圖片網址；伺服器端的 storage 模組會拉進 `fs`，
進不了瀏覽器的 bundle。搬 S3／CloudFront 時把這個值指向 CDN 網域即可。

**`LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` 留空時，LINE 登入會自動停用**（前台不顯示按鈕，
手機號碼那條路照常運作），所以不必為了上線硬等客戶交金鑰。
⚠ 建 Channel 時，**Provider 必須開在客戶自己的 LINE Business ID 底下**，再把我們加為
管理者。LINE Login 的 `userId`（sub）是綁 Provider 的——建錯擁有者、日後要搬，
等於全體會員的 LINE 綁定作廢，只能請每一位客人重新綁一次，救不回來。
Login Channel 與未來的 Messaging API Channel 也要在同一個 Provider 底下，
之後才能把「官方帳號好友」跟「登入使用者」對起來。

### 使用者上傳的檔案（代購站的商品照）

存在 **`/var/www/avalo-uploads`，刻意在 repo 樹之外**。

理由是部署流程：`deploy.sh` 與 `server-update.sh` 都用 `rsync --delete`，
**任何寫進 repo 樹的執行期檔案都會在下一次部署時被刪光**。2026-07-30 就是這樣把
`prod.db` 整個刪掉過一次；而商品照片沒有 `.db` 那種每日備份，掉了就真的沒了。
`src/lib/storage/local-disk.ts` 是唯一知道這個路徑的檔案（有結構性測試守著，
日後換 S3 只要改那一個檔）。

nginx 以 `location ^~ /u/` 直接送這個目錄，**完全不經過 Node**——一台 t3.micro
沒有多餘的 CPU 拿去轉發靜態圖片。檔名是 16 bytes 亂數且內容永不改寫，
所以帶 `immutable` 快取；也因為這些檔案無認證直送，**不可猜的檔名就是它們唯一的存取控制**。

`client_max_body_size` 維持 `2m` 不要調高。前端會先把照片壓到長邊 1600px、
約 300KB，而且**一次只傳一張**；真的傳不動一定是前端壓縮壞了，不是這個數字太小。
（有測試守住這個值。）

**備份**由 [backup-uploads.sh](backup-uploads.sh) 每日同步到 S3（見第 5 節）。
`backup-db.sh` 只管 SQLite，照片是獨立一支——兩者失敗互不影響，log 也分得開。

⚠ 那支**刻意不加 `--delete`**：`sweepBatchFullImages` 會在檔期結束 30 天後
清掉本機大圖（只留縮圖），加了 `--delete` 遠端的大圖會跟著消失；而且來源目錄
哪天掛載失敗或被清空，一次同步就會把遠端副本一起抹掉。備份只該累加。
成本可以忽略：一檔約 28MB，一年不到 1.5GB。

容量參考：一檔連線約 20 件 × 5 張 ≈ 28MB，其中九成是大圖。
檔期關閉滿 30 天後會自動只清大圖、保留縮圖（約 3MB／檔），回收九成空間。
清掃是機會式的（她上傳或開後台時順手掃一點），**沒有 cron**。

## 3. HTTPS（Let's Encrypt，自動續期）

憑證涵蓋的網域清單維護在 **`deploy/domains.txt`**（主站 + 每個客戶站子網域），
用同一張憑證涵蓋全部，新增客戶時 `--expand` 擴充即可。

```bash
sudo snap install --classic certbot
sudo certbot --nginx --expand $(sed '/^#/d;/^$/d;s/^/-d /' /opt/avalo/app/deploy/domains.txt | tr '\n' ' ')
sudo certbot renew --dry-run
```

## 3.5 客戶站（多租戶子網域）

客戶站掛在 `<slug>.avalokite.xyz`，由 Next 的 `src/proxy.ts` 依 `Host` 改寫到內部路由
`/sites/<slug>/*`。子目錄形式（`avalokite.xyz/<slug>`）已淘汰——會稀釋主站主題，
且落入 Google site reputation abuse（寄生內容）政策範圍。

**一次性設定（只做一次）**

1. GoDaddy DNS 加 A 記錄：`*` → `13.209.138.204`。之後新增客戶完全不用碰 DNS。
2. nginx 的 `server_name` 需含萬用子網域，並加上 default server 擋 Host 亂送。
   `deploy/nginx.conf` 已是正確版本，但**正式機上的 `/etc/nginx/sites-available/avalo`
   已被 certbot 改寫過（多了 443 區塊），不可直接覆蓋**，請手動比對這兩處：

   ```nginx
   # 主站台（80 與 443 兩個 server 區塊都要改）
   server_name avalokite.xyz www.avalokite.xyz *.avalokite.xyz;
   ```
   並把 `deploy/nginx.conf` 最上方兩個 `default_server` 區塊複製過去。
   改完 `sudo nginx -t && sudo systemctl reload nginx`。

**新增一家客戶**

1. `src/lib/tenants.ts` 的 `TENANTS` 加一筆（`slug` 即子網域，不可用 `RESERVED` 內的字）。
2. 建站頁面：`cp -r src/app/sites/wenshan src/app/sites/<slug>` 後改資料與樣式。
   刻意不做通用模板——各站自帶 root layout 與 CSS，App Router 會分別 code-split，
   互不影響；共用元件的回歸測試成本反而更高。
3. `deploy/domains.txt` 加一行 `<slug>.avalokite.xyz`。
4. 正式機 `.env` 加該租戶的通知收件人（例 `TENANT_NOTIFY_<SLUG>=owner@example.com`，
   逗號分隔可多人）。**`.env` 被 rsync 排除，必須直接改伺服器上那份再 restart。**
5. 部署後跑第 3 節的 certbot `--expand`。

**目前已上線的客戶站**

| slug | 客戶 | 特殊之處 |
| --- | --- | --- |
| `wenshan` | 文山木材行 | 線上估價單 `/api/wenshan/quote` |
| `monsieurlong` | Monsieur Long 隆先生 | 合作邀請／訂購表單 `/api/monsieurlong/inquiry`；後台多一頁 `/portal/board`（今日口味），需 `FlavorBoard` migration；`ownSitemap` 由站內 `sitemap.ts` 產生 |
| `rekat` | REKAT ROASTERY 日卡地自然農莊 | 線上商店：購物車→訂單 `/api/rekat/order`（另有 `/lookup`、`/remit`），需 `ShopOrder` migration；後台多兩區 `/portal/orders`（訂單）與 `/portal/beans`（本期供應，需 `BeanStock` migration）；`ownSitemap` 由站內 `sitemap.ts` 產生 |

Monsieur Long 首次部署的額外步驟（只做一次）：

1. `npx prisma migrate deploy` 會建立 `FlavorBoard` 表（deploy.sh 已含）。
2. 伺服器 `.env` 加 `PORTAL_PW_MONSIEURLONG`（隨機強密碼，交給店家）與
   `TENANT_NOTIFY_MONSIEURLONG`（店家收表單的信箱），然後 `sudo systemctl restart avalo`。
3. certbot `--expand`（domains.txt 已加 `monsieurlong.avalokite.xyz`）。
4. 內容定稿、店家確認可對外後，再把 `tenants.ts` 的 `indexable` 與
   `_data/site.ts` 的 `INDEXABLE` 一起改 `true`（在那之前 robots 是 Disallow，
   sitemap 也刻意回空）。

REKAT ROASTERY 首次部署的額外步驟（只做一次）：

1. `npx prisma migrate deploy` 會建立 `ShopOrder` 表（deploy.sh 已含）。
2. 伺服器 `.env` 加 `PORTAL_PW_REKAT`（隨機強密碼，交給店家）與
   `TENANT_NOTIFY_REKAT`（店家收訂單的信箱；未拿到前先填 Avalo 自己的收件匣），
   然後 `sudo systemctl restart avalo`。
3. certbot `--expand`（domains.txt 已加 `rekat.avalokite.xyz`）。
4. **上線前務必先跟客戶核對匯款銀行帳號**（`src/app/sites/rekat/_data/shop.ts` 的 `BANK`）。
   留空時前台會退成「我們會與您聯絡提供帳號」，不會顯示假帳號，但客人也就無法自助付款。
   運費（100／滿 2000 免運／貨到付款免手續費）與地址已客戶確認。
   註：紙本豆單有「三包」整組優惠價，但**線上商店刻意不提供任何折扣**
   （客戶 2026-09-09 指示），所以 `priceCart()` 沒有折抵邏輯，這不是漏掉。
5. 內容定稿、店家確認可對外後，再把 `tenants.ts` 的 `indexable` 與
   `_data/site.ts` 的 `INDEXABLE` 一起改 `true`。

**豆單的兩種變動節奏（REKAT）**

| 要改什麼 | 誰做 | 怎麼做 | 生效 |
| --- | --- | --- | --- |
| 某支售完／補貨／暫時下架 | 店家自己 | `/portal/beans` 選狀態按儲存 | 立即 |
| 官網公告一句話 | 店家自己 | 同上，表單最下方 | 立即 |
| 換整份豆單（新品項、改價） | Avalo | 改 `_data/beans.ts`＋`site.ts` 的 `listVersion`＋`tests/rekat-shop.test.ts` 的 `SHEET` 對照表，部署 | 部署後 |

為什麼售價不開放後台改：`priceCart()` 是前後台共用的**同步**純函式，客人的瀏覽器要能
自己算出跟伺服器一樣的金額，這才讓「前端偽造價格無效」在結構上成立。把售價搬進資料庫
會讓那條路變成非同步，等於拆掉這個保證。所以 `BeanStock` 只承載「狀態」，不承載
「身分與價格」。同理，風味家族、插畫母題、產區背景與文案是設計與編輯資產，留在版控裡。

**客戶改綁自有網域**

1. 客戶把該網域的 A 記錄指到 `13.209.138.204`。
2. `tenants.ts` 該筆填 `domain: "example.com.tw"`，並視情況把 `indexable` 改 `true`
   （同時把該站 `_data/site.ts` 的 `INDEXABLE` 一併改）。
3. `deploy/domains.txt` 加該網域與 `www.` 版本，跑 certbot `--expand`。
4. 子網域維持可用並 301 轉址至新網域，**免費保留 6 個月**（合約條款）。

## 3.6 信件寄送與網域信譽

**現況（2026-07-31 查證）**：所有通知信（主站詢問單、訂單、客戶站表單）都從
`service@chaingull.com` 經 Google Workspace（`smtp.gmail.com:587`）寄出。
chaingull.com 的 SPF／DKIM／DMARC 齊全且對齊，信件驗證沒有問題。

**avalokite.xyz 本身不寄信**，應維持以下防偽造姿態（記錄設在 GoDaddy）：

| 類型 | 名稱 | 值 | 用途 |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.google.com -all` | 只有 Google 可代寄，其餘硬性拒絕 |
| TXT | `_dmarc` | `v=DMARC1; p=reject; adkim=s; aspf=s; rua=mailto:service@chaingull.com` | 偽造直接拒收；報告寄給自己 |

外加一筆設在 **chaingull.com**（不是 avalokite.xyz）的授權記錄，否則跨網域的
DMARC 報告多數郵件商不會寄：

| 類型 | 名稱 | 值 |
|---|---|---|
| TXT | `avalokite.xyz._report._dmarc` | `v=DMARC1` |

> ⚠️ **不要加 null MX（`MX 0 .`）**。法務頁（`/legal/*`）掛著 `hello@avalokite.xyz`
> （來源 `src/lib/site.ts`），加了就等於永久保證該地址退信。
> 目前 avalokite.xyz 無 MX 且 A 記錄那台沒跑 SMTP，**寄到 hello@ 其實已經一律退信**——
> 要嘛設轉寄／Workspace 別名網域收下來，要嘛把 site.ts 的 `email` 改成實際收得到的地址。

**日後把交易信搬離 Gmail 時**（客戶變多、不想再讓客戶表單的流量影響商務信箱信譽）：
1. 選 Resend 或 AWS SES，寄件網域用 `mail.avalokite.xyz`（與 chaingull.com 完全隔離，
   且對客戶而言品牌一致）。
2. 在該子網域設 SPF 與服務商給的 DKIM。avalokite.xyz 現有的 DMARC 會自動涵蓋子網域，
   不必另設 `_dmarc.mail`。
3. 只改 `.env` 的 `SMTP_*` 與 `MAIL_FROM`，程式碼不動——`notifyTenant()` 已經是
   「From 固定自有網域＋顯示名做租戶品牌化＋Reply-To 指向提交者」的正確寫法。
4. 用 mail-tester.com 確認 SPF/DKIM/DMARC 三項皆通過再切換。

## 3.7 收款時點與欠費處理（客戶站營運）

### 月費什麼時候開始收

含建置的訂單（含零元啟動），**月費不是下單就開始扣的**：

1. 客戶結帳 → 只刷一次性款項。零元啟動刷的是 **NT$2,000 席次保留金**
   （含稅 2,100），保留名額並排入製作排程，上線後全額折抵首期月費。
2. 網站做好、客戶驗收 → **到 `/admin` 訂閱列按「標記已上線」**。
   這一按會做三件事：寫下上線日、以該日起算最短承諾期、立刻寄出定期定額授權連結。
3. 客戶完成授權 → 首期當下扣款，之後每月自動扣。中離未授權的由
   `/api/cron/dunning` 的姊妹 cron `care-links` 追兩封，再不理就通知站方人工處理。

**沒有按那顆按鈕，系統一毛月費都不會收**（授權連結不會寄、客戶自助頁只顯示
「網站尚未上線，月費尚未開始」）。交付後忘了按＝白做工，後台那一列會標紅字
「尚未上線・未計費」提醒。

理由寫在 `prisma/schema.prisma` 的 `Subscription.launchedAt`：月費買的是主機、備份、
監控與改稿，網站沒上線時這些服務一項都還沒發生，先收就是收了沒有對價的錢。

### 客戶欠費了怎麼辦

綠界的定期定額**扣款失敗不會自動重試**，該期就是沒收到，下一期仍照排程扣。
所以欠費的樣態是連續數期 `failed`，不是一次性事件。`/api/cron/dunning` 每天跑一次，
依「首次扣款失敗日」推進催收階梯（與服務條款第九條逐字對應）：

| 天數 | 系統做什麼 |
|---|---|
| D+0 | 扣款失敗信（更新付款方式連結） |
| D+3 | 再次提醒 |
| D+7 | 預告「第 15 日將暫停服務」 |
| D+15 | 通知客戶服務已暫停，**並寄一封含指令的信給站方** |
| D+30 | 通知客戶契約終止（含承諾期補償金額），並通知站方到 `/admin` 終止授權 |

**D+15 的暫停是人工按的，不是 cron 自動關站。** 扣款失敗最常見的原因是卡片過期
而不是賴帳，讓 cron 自動下線會把一次換卡的小麻煩變成一次公開事故。

暫停一個客戶站（兩秒生效，不必重新部署）：

```bash
sudo nano /opt/avalo/app/.env      # 把 slug 加進 SUSPENDED_TENANTS（逗號分隔）
sudo systemctl restart avalo
```

暫停後該站所有公開頁面、robots、sitemap 與表單／訂單 API 都回 503 暫停頁。
**`/portal` 刻意仍然開著**——條款保證客戶隨時可匯出自己的資料，把後台一起關掉
等於用扣留資料當籌碼。恢復服務就是把 slug 從那一行移除再 restart 一次。

### 承諾期內提前終止要收多少

不是「補付剩餘月份的月費」（那是第 3 個月走人就要 42,000，開不了口也收不到），
而是**補付尚未攤提完畢的建置費**，級距定義在 `src/lib/products.ts` 的
`EARLY_EXIT_TIERS`，條款第三條與退款政策引用同一組數字：

| 已完成扣款期數 | 補付（未稅） |
|---|---|
| 0–5 | NT$30,000 |
| 6–11 | NT$20,000 |
| 12–17 | NT$10,000 |
| 18–23 | NT$5,000 |
| 24 起 | 0（並免費移交原始碼） |

金額會直接顯示在客戶的訂閱管理頁，不是藏到爭議發生才拿出來的東西。

### 客戶站與訂單的對應

欠費通知信要指名「該暫停哪一個 slug」，靠的是 `src/lib/tenants.ts` 每個租戶的
`orderId` 欄位。**新客戶轉正（開始收月費）時要記得補上這一行**，否則 D+15 那封信
只會告訴你有人欠費，得自己回頭比對客戶名單。

## 4. 綠界正式環境切換清單

特約商店申請已於 **2026-08-24 通過審核**，正式參數在綠界後台
「系統設定 → 系統介接設定」。

1. 申請綠界「特約商店」：網站需已上線並含 **價格、聯絡方式、退款政策**（本站已內建 `/legal/refund` 等頁）。
2. 後台取得正式 MerchantID / HashKey / HashIV → 填入**伺服器**的 `.env`，`ECPAY_ENV="production"`。
   `.env` 被 rsync 排除，一定要直接改伺服器上那份再 `sudo systemctl restart avalo`；
   本機 `.env` 維持測試商店 2000132，否則本機開發會刷到真卡。
3. **抄完金鑰立刻驗章**：`node deploy/verify-ecpay.mjs`（唯讀查詢，不產生金流）。
   後台顯示金鑰的字型裡 `0/O`、`1/l/I` 幾乎分不出來（後台自己附了辨識說明），
   抄錯的話所有交易都會被綠界擋在 CheckMacValue，但要等到真人刷卡才看得出來。
   在伺服器上必須用 avalo 身分跑（`/opt/avalo/app` ubuntu 讀不到，見雷 #5），
   且工作目錄要在 app 底下腳本才找得到 `.env`：

   ```bash
   sudo -u avalo bash -c "cd /opt/avalo/app && node deploy/verify-ecpay.mjs"
   ```
4. 綠界後台設定不需要填回呼網址（本站每筆交易動態帶入），但需確認：
   - 信用卡收單已開啟「定期定額」功能（**需另外申請，特約商店過審不含這項**）。
     沒開的話一次性付款會正常、維護訂閱授權會失敗——而本站所有含建置的訂單都綁維護。
5. 真卡小額測試一筆（可下單「網站健檢」NT$9,900）並退款驗證流程。
   另建議測一筆維護訂閱授權，確認 `/api/ecpay/period-return` 有收到每期通知。
6. 停止某客戶訂閱扣款：綠界後台 → 信用卡收單 → 定期定額查詢 → 以 admin 後台顯示的授權單號（gwsr）終止授權。

## 5. 備份（每日 SQLite ＋ 商品照片 → S3）

備份分兩支，各自獨立跑、各自記 log：

| 腳本 | 備什麼 | 保留 |
|---|---|---|
| [backup-db.sh](backup-db.sh) | SQLite 一致性快照（`.backup`，WAL 下安全） | 本機 30 份、S3 30 份 |
| [backup-uploads.sh](backup-uploads.sh) | `/var/www/avalo-uploads` 的商品照片 | S3 只累加、不刪 |

**為什麼照片一定要備**：EBS 掉了，照片就真的沒了——那些商品早就採買、寄給客人，
不可能重拍。資料庫會留著一堆指向不存在檔案的 `DgImage` 列，前台變成一整片破圖。

### 5.1 AWS 這一側（需要有 AWS 主控台權限的人做一次）

**不要用 access key**，掛 IAM Role 到執行個體——機器上就不會有任何長期憑證。

```bash
# 1) 建桶（首爾，與 EC2 同區域；桶名要全球唯一）
aws s3api create-bucket --bucket avalo-backup-amberpick --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 2) 擋掉所有公開存取（備份裡有全部客人的個資）
aws s3api put-public-access-block --bucket avalo-backup-amberpick \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 3) 開版本控制（誤刪／被加密勒索時還救得回來）
aws s3api put-bucket-versioning --bucket avalo-backup-amberpick \
  --versioning-configuration Status=Enabled
```

IAM 政策（**只給這個桶**，不要用 AmazonS3FullAccess）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::avalo-backup-amberpick" },
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::avalo-backup-amberpick/*" }
  ]
}
```

把它做成 Role（信任 `ec2.amazonaws.com`）後掛到執行個體：

```bash
aws ec2 associate-iam-instance-profile \
  --instance-id i-080aea2eb044b3149 \
  --iam-instance-profile Name=avalo-backup-profile
```

### 5.2 伺服器這一側

```bash
# aws cli v2（⚠ 不要用 snap 版：snap 拒絕在 HOME 不在 /home 底下時執行，
# 而 avalo 的家目錄是 /opt/avalo，cron 會直接失敗）
cd /var/tmp && curl -sS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip -q awscliv2.zip && sudo ./aws/install && rm -rf /var/tmp/aws /var/tmp/awscliv2.zip

# 桶名寫進 .env（⚠ 不是寫進 crontab——兩支腳本都會自己讀 .env）
echo 'BACKUP_S3_BUCKET="avalo-backup-amberpick"' | sudo tee -a /opt/avalo/app/.env

# 照片備份的排程（資料庫那條已經在了）
sudo -u avalo crontab -e
# 25 3 * * * /opt/avalo/app/deploy/backup-uploads.sh >> /opt/avalo/backup.log 2>&1
```

驗證：

```bash
sudo -u avalo bash -lc '/opt/avalo/app/deploy/backup-db.sh'
sudo -u avalo bash -lc '/opt/avalo/app/deploy/backup-uploads.sh'
tail -4 /opt/avalo/backup.log   # 要看到 "local + s3" 與 "uploads backup ok"
```

### 5.3 還原

```bash
# 資料庫
aws s3 cp s3://avalo-backup-amberpick/avalo-db/<檔名>.db.gz /var/tmp/
gunzip -c /var/tmp/<檔名>.db.gz > /var/tmp/restore.db
sqlite3 /var/tmp/restore.db "pragma integrity_check;"      # 必須是 ok
sudo systemctl stop avalo
sudo -u avalo cp /var/tmp/restore.db /opt/avalo/app/prisma/prod.db
sudo -u avalo sqlite3 /opt/avalo/app/prisma/prod.db "PRAGMA journal_mode=WAL;"
sudo systemctl start avalo

# 照片
sudo aws s3 sync s3://avalo-backup-amberpick/uploads/ /var/www/avalo-uploads/
sudo chown -R avalo:avalo /var/www/avalo-uploads
```

### 5.4 現況

已於 **2026-09-09** 完成設定並**實際做過還原演練**：

| 檢查 | 結果 |
|---|---|
| IAM Role | `avalo-backup-role`（掛在 `i-080aea2eb044b3149`，機器上沒有任何長期憑證） |
| 權限範圍 | 只有 `avalo-backup-amberpick` 這一個桶；讀其他桶會被拒 |
| 資料庫還原 | 從 S3 取回 → `integrity_check = ok`，筆數與正式庫一致 |
| 照片還原 | 36 個檔案全數取回，**逐檔 md5 與正式站完全相同** |
| 排程驗證 | 兩支腳本都在 **cron 的最小環境**（`PATH=/usr/bin:/bin`、非登入 shell）下跑過 |

⚠ **以後改動備份相關的東西，要重跑一次 5.3 的演練。**
沒有驗證過的備份不算備份，而它失效的時候不會有任何徵兆。
每日報表現在會帶 `s3_avalo_db_age_h` 與 `s3_uploads_age_h`——
數字爬過 48 就代表離線備份至少漏了一天。

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

> ⚠️ 六個踩過的雷（[server-update.sh](server-update.sh) 與 [deploy.sh](deploy.sh) 已內建處理）：
> 1. **`prisma migrate deploy` 不會重生 client** —— 一定要先 `npx prisma generate`，否則新 schema 欄位型別對不上、`next build` 會失敗。
> 2. **build 步驟別接 `| tail`** —— 那會用 tail 的 exit code 蓋掉 build 的，導致 build 失敗仍繼續 restart、帶壞的 `.next` 上線。腳本用 `set -euo pipefail`。
> 3. **build 記憶體吃緊（t3.micro）** —— 腳本以 `NODE_OPTIONS=--max-old-space-size=1536` 讓 node 用 swap 當緩衝，避免被系統 OOM 直接砍掉。
> 4. **`rsync --delete` 會刪掉正式資料庫** —— 本機上傳時排除了 `prisma/*.db*`，所以 `/tmp/app/prisma/` 裡沒有 `prod.db`；伺服器端若不排除，`--delete` 就會把正式庫刪光，`migrate deploy` 再造一個空的，訂單／付款／訂閱全沒。腳本已加 `--exclude 'prisma/*.db*'` 系列，並在同步前先跑一次 [backup-db.sh](backup-db.sh)。2026-07-30 實際踩過一次（當時庫內只有機器人灌的垃圾資料，無實質損失）。
> 5. **`[ -f "$APP/.next/..." ]` 永遠判為假** —— `/opt/avalo/app` 屬於 avalo 使用者，
>    ubuntu 讀不到，所以判斷「有沒有本機送上來的產物」必須用 `sudo test -f`，
>    否則會靜靜地每次都退回伺服器 build（症狀：本機與伺服器的 `.next/BUILD_ID` 對不起來）。
> 6. **`NEXT_PUBLIC_*` 會在 build 當下被烤進 bundle** —— 改成本機 build 之後，本機 `.env`
>    的開發用值（`NEXT_PUBLIC_SITE_URL=http://localhost:3000`）會被編進正式站的 sitemap、
>    robots 與 canonical。2026-08-03 實際踩過：上線的 `sitemap.xml` 整份都是 localhost 網址。
>    [deploy.sh](deploy.sh) 已改為 build 前先 ssh 取伺服器 `.env` 的 `NEXT_PUBLIC_*` 並 export
>    （取不到就中止，不讓錯的值上線）。**新增任何 `NEXT_PUBLIC_` 變數時，要記得加到伺服器的
>    `.env`，本機那份不會影響正式站。**

## 修改服務條款／退款政策的程序

條款是客戶結帳時打勾同意的契約本文，訂單會存下當下的**版本號、內容雜湊、時間與 IP**
（`Order.agreedTerms*`），確認信也會附上版本連結。所以條款不能直接改——直接改會讓既有
訂單的同意紀錄對不回原文，等於自廢舉證能力。

```
1. 把 legal-content.ts 現行的 LEGAL.terms 與 LEGAL.refund 整段複製進
   legal-archive.ts，以「現行的」LEGAL_VERSION 當 key
2. 再改 legal-content.ts 的內容，並把 LEGAL_VERSION 改成今天的日期
3. npx vitest run tests/legal.test.ts   ← 會擋下漏封存、中英不同步、updated 沒跟著改
4. 照常部署
```

`legal-archive.ts` **只增不改**：既有條目動一個字就等於偽造證據。
新版條款只對其生效後的訂單有效（條款第十四條已明訂），既有訂單仍適用下單時的版本，
客戶可用 `/legal/terms?v=<版本>` 查回當時的全文。

## 監控與告警

| 排程（root crontab） | 做什麼 |
|---|---|
| `*/5 * * * *` [health-check.sh](health-check.sh) | 檢查網站是否活著、磁碟 <85%、憑證 >20 天。異常才寄信，同一項目 1 小時冷卻，恢復時也會通知 |
| `0 0 * * *` [daily-report.sh](daily-report.sh) | 台北時間早上 8 點寄每日簡報（HTML 儀表板）：先給結論與待辦，再列防禦戰報、流量、生意、機器狀況 |

| 排程（avalo crontab） | 做什麼 |
|---|---|
| `15 3 * * *` `/opt/avalo/run-care-cron.sh` | 打兩支 cron：`/api/cron/care-links` 追回「已上線但維護未授權」的訂單（最多 2 封信），`/api/cron/dunning` 跑欠費催收階梯。log 在 `/opt/avalo/cron-care.log` |
| `15 3 * * *` [backup-db.sh](backup-db.sh) | SQLite 備份上傳 S3 |
| `25 3 * * *` [backup-uploads.sh](backup-uploads.sh) | 商品照片同步到 S3（只累加，不刪） |

`run-care-cron.sh` 刻意住在 repo 外（`/opt/avalo/`），內容是從 `.env` 讀 `CRON_SECRET`
再 curl 本機端點——秘密只存在 `.env` 一處，不會跟著 rsync 進 repo。兩支 cron 共用這個腳本：

```bash
#!/usr/bin/env bash
set -euo pipefail
CRON_SECRET="$(grep -E '^CRON_SECRET=' /opt/avalo/app/.env | cut -d= -f2- | tr -d '"')"
for ep in care-links dunning; do
  echo "--- $(date -Is) $ep"
  curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" "http://127.0.0.1:3000/api/cron/$ep" || true
  echo
done
```

**`CRON_SECRET` 只需要在伺服器的 `.env` 有**；本機沒有時該端點會回 401，這是預期行為
（本機要測就自己加一個開發用的值，不必與正式站相同）。

寄信走 [notify.js](notify.js)（伺服器沒有 MTA，直接沿用 `.env` 那組 SMTP）。
**每日簡報同時是心跳**：整台機器掛掉時 health-check 也寄不出信，所以「某天沒收到簡報」本身就是警訊。
真正的外部監控（UptimeRobot 之類）仍建議另外接，才擋得住整台機器失聯的情況。

### 每日簡報怎麼讀

信分兩支程式：[daily-report.sh](daily-report.sh) 只採集（輸出 TSV），
[report-render.js](report-render.js) 負責判讀、排版成 HTML 並寄出（純文字版一併附上，
不吃 HTML 的信箱照樣讀得到）。改版面不必上伺服器，本機就能預覽：

```bash
node deploy/report-render.js --stdout < deploy/report-sample.tsv > /tmp/preview.html
node deploy/report-render.js --text   < deploy/report-sample.tsv   # 純文字版與主旨
```

主旨開頭的 ✅ ／ ⚠️ ／ 🔴 就是當天結論，信的第一段是「今天需要你做的事」——
沒有待辦時可以直接歸檔，其餘數字都只是佐證。幾個關鍵欄位：

- **漏網檢查**：命中掃描特徵（`.env`、`wp-admin`…）卻被送進 Next 的請求數（2xx／404／405）。
  `0` 代表攔截樣式覆蓋完整；>0 就是有探測穿過去了，信裡會列出實際路徑，
  照著補進 [nginx-scan-block.conf](nginx-scan-block.conf) 即可。
- **只拿到導轉**：命中掃描特徵、但拿到 3xx 的請求數。沒進到程式，所以不算漏網，
  但代表某個 server 區塊少了 `include /etc/nginx/snippets/avalo-scan-block.conf` ——
  access.log 記的是 301 而非 444，fail2ban 的 `avalo-honeypath` 就抓不到它。
  2026-08-26 首次上線當天就抓到這個：certbot 產生的 :80 導轉站台沒有攔截規則，
  前一天 15 次探測全都只拿到 301（詳見 snippet 內的註解）。
- **後台成功登入**：來自 `src/app/api/*/login/route.ts` 印的 `[auth ok]`。
  成功與失敗在 nginx log 都是 303，只有這行分得出來——沒有它就答不出「後台有沒有被進去過」。
- **4xx 的組成**：444／429 是「系統主動攔截」，不是網站壞掉；真正代表我方有問題的只有 5xx，
  以及路徑認得出來的 404（＝自家壞連結）。

### 改掃描攔截樣式時怎麼驗

樣式住在 [nginx-scan-block.conf](nginx-scan-block.conf)，`daily-report.sh` 的 `PROBE_RE`
必須是同一份（awk 不吃 `\.`，所以那邊寫成 `[.]`，其餘字元完全相同）。改完跑三關：

1. **兩份樣式一致**——把 `\.` 正規化成 `[.]` 後字串必須完全相等。
2. **零誤傷**——拿站上真實路由清單（含 `/_next/` 雜湊檔名、`/.well-known/acme-challenge/`、
   `public/` 靜態檔、所有 `/api/*`）去比對新樣式，命中數必須是 0。
3. **繞得過就不算數**——上線後從伺服器用 `--resolve ...:127.0.0.1` 實打一輪
   （127.0.0.1 在 fail2ban 預設 `ignoreip` 內，不會封到自己）：
   大小寫、`//`、`/./`、`/a/../`、`%2e` 編碼、結尾 `/`、查詢字串、巢狀路徑，
   以及四個主機名（主站／www／客戶子網域／不存在的子網域）× `:80` 與 `:443`。
   HTTP/1.1 下 444 表現為 curl rc=52/56，HTTP/2 下是 rc=92，都算擋下。
   同一輪要順便確認 `/`、`/en`、客戶站首頁、acme-challenge 沒被誤擋。

加樣式的原則：只加「正常訪客不可能產生」的路徑。像 `rc`、`mail` 這種通用字刻意不加——
未來客戶站可能真的有 `/mail`，為了少數幾次探測冒誤擋真人的風險不划算。

## 安全防護總覽

| 層 | 措施 |
|---|---|
| AWS | SG 只開 80/443/22(限源IP)、IAM Role 而非金鑰、EBS 快照 |
| 主機 | SSH 金鑰限定＋禁 root、fail2ban（4 個 jail，見 [fail2ban/](fail2ban/)）、unattended-upgrades、UFW、swap |
| Nginx | 速率限制（表單 6r/min、API 5r/s、頁面 10r/s，綠界回呼白名單）、單 IP 併發上限、掃描路徑 444（:443 與 :80 兩個 server 區塊都 include [nginx-scan-block.conf](nginx-scan-block.conf)）、安全標頭＋CSP、隱藏版本 |
| 應用 | Zod 驗證所有輸入、價格以伺服器目錄為準、ECPay CheckMacValue 雙向驗章、admin HMAC session＋登入鎖定、systemd 沙箱（NoNewPrivileges/ProtectSystem） |
| 資料 | 卡號完全不經手（綠界頁面處理）、每日備份 S3 保留 30 份 |
