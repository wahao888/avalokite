// 欠費暫停開關 —— 客戶站掛在我們的主機與網域下，這是唯一真正能執行 24 個月合約的槓桿。
//
// 為什麼是環境變數而不是資料庫：
// ① proxy 每個請求都會跑，官方文件明講它不該做資料抓取；為了一個幾乎永遠是空集合的
//    旗標，讓每個客戶站請求多打一次 DB，代價與收益完全不成比例。
// ② 為什麼也不是 tenants.ts 的欄位：暫停是營運事件，不是設計資產。改 .env 後
//    `systemctl restart avalo` 兩秒生效，不必重新 build，也不會把「某某客戶欠費」
//    這種事寫進 git 歷史。
//
// 為什麼不讓催收 cron 自動暫停：把一個付費客戶的網站關掉是商務決定，
// 不該由一次可能只是卡片過期的扣款失敗自動觸發。cron 負責在 D+15 把該做的事
// 連同指令一起寄到站方信箱（見 /api/cron/dunning），按下去的是人。
//
// 設定格式：SUSPENDED_TENANTS=rekat,wenshan（逗號分隔的 slug，留空＝沒有人被暫停）

const parse = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

/** 目前被暫停的租戶 slug。每次呼叫都重讀 env，重啟即生效、不必清快取。 */
export const suspendedSlugs = (): Set<string> => parse(process.env.SUSPENDED_TENANTS);

export const isSuspended = (slug: string): boolean =>
  suspendedSlugs().has(slug.toLowerCase());

/**
 * 暫停頁。刻意是 proxy 直接吐出的自包含 HTML，不改寫到 app 路由：
 * 被暫停的站台不該再跑它自己的任何一行 render 程式碼。
 *
 * 回 503 而不是 200：告訴搜尋引擎這是暫時性狀態，不要把既有排名的頁面
 * 換成這一頁的內容（配合 robots 的 Disallow 與 Retry-After）。
 */
export function suspendedPage(name: string, contact: string): string {
  return `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>服務暫停中</title>
<style>
:root{color-scheme:light}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:#F0EBE3;color:#2F2B26;font-family:Georgia,"Noto Serif TC",serif;padding:2rem}
.box{max-width:32rem;text-align:center}
h1{font-size:1.5rem;font-weight:600;margin:0 0 1rem}
p{font-size:0.95rem;line-height:1.8;color:#6B6459;margin:0 0 0.8rem}
a{color:#4A5D3A}
</style></head><body><div class="box">
<h1>本站服務暫停中</h1>
<p>${name} 的網站服務目前暫停，稍後恢復。</p>
<p>若您是本站營運者，請與我們聯繫以恢復服務：<a href="mailto:${contact}">${contact}</a></p>
</div></body></html>`;
}
